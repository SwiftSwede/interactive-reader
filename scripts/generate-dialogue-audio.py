#!/usr/bin/env python3
"""
generate-dialogue-audio.py — Produce multi-voice audio for a Kyle dialogue.

v3 approach (room-tone continuous):
  - Each dialogue LINE is ONE API render (continuous room tone).
  - Sentences inside a line are separated by <break> tags (model-generated
    pauses — no spliced digital silence = no stitching artifacts).
  - Per-sentence intensity tags ([quietly], [excited], ...) give loudness
    variance, especially for Gordon.
  - Only speaker TURNS get a tiny ffmpeg pad (0.15s) at the boundary.

Usage:
  python3 scripts/generate-dialogue-audio.py superstitious-minds --sample
  python3 scripts/generate-dialogue-audio.py superstitious-minds

Inputs:
  - Vault: "$VAULT/Language-Wiki/raw/stories/int dialogues/Superstitious-Minds.md"
  - Cast:  ~/Desktop/el-auditions2/cast.json

Output:
  - Per-line MP3s in /tmp/dialogue-audio/<slug>/
  - Stitched: public/audio/stories/<slug>.mp3 (or sample-stitched-v3.mp3)
"""

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(REPO, ".env.local")
VAULT = os.path.expanduser("~/Documents/Obsidian Vault/Language-Wiki/raw/stories/int dialogues")
CAST_PATH = os.path.join(REPO, "scripts", "voice-cast.json")
API = "https://api.elevenlabs.io/v1"
MODEL = "eleven_v3"
OUT_FORMAT = "mp3_44100_128"

SLUGS = {"superstitious-minds": "Superstitious-Minds.md"}

PAUSE_TURN = 0.15          # tiny ffmpeg pad only at speaker changes
BREAK_IN_LINE = 0.40       # model-generated breath between sentences

# Scene beats: lead/trail silence (seconds) around specific lines, matching
# stage directions (door spill, laptop close, watching, exits, knocks, gathering).
# 67→68 gap (trail 2.5 + lead 2.5 = 5.0s) holds BOTH knock sounds:
#   glass knocks at ends[67]+0.15, wood knocks at starts[68]-2.4.
SCENE_PADS = {
    0: {"lead": 1.4},                   # door bursts open, glass spills (before first line)
    56: {"lead": 1.6},                  # Brenda closes her laptop (before twist)
    59: {"lead": 1.8},                  # Pedro watches Brenda for a long moment
    67: {"trail": 2.5},                 # Gordon raps the glass table twice
    68: {"lead": 2.5},                  # Pedro winces, knocks the wooden frame
    69: {"trail": 2.5},                 # Gordon gone; they gather their things
    72: {"trail": 2.0},                 # Brenda gathers things, moves the water glass
}

VOICE_SETTINGS = {
    "GORDON": {"stability": 0.30, "similarity_boost": 0.80},  # most dynamic
    "PEDRO":  {"stability": 0.55, "similarity_boost": 0.80},  # serene
    "BRENDA": {"stability": 0.50, "similarity_boost": 0.80},  # controlled
}

# AI director map. Per line:
#   "mood": delivery direction (logged, informs tag choices)
#   "tag":  audio tag on line opener
#   "sent": optional per-sentence intensity tags {chunk_index: "[tag]"}
DIRECTIONS = {
    0: {"mood": "startled, pointing at the floor"},
    1: {"mood": "calm confirmation, serene as ever"},
    2: {"mood": "anxious CEO spiral — mutter, build, ramble, deflate",
        "sent": {0: "[quietly]", 1: "[worried, building]", 2: "[anxious ramble]", 3: "[deflated mutter]"}},
    3: {"mood": "reassuring mystic, utterly unbothered",
        "sent": {0: "[warm calm]", 1: "[matter-of-fact mystic]", 2: "[practical, gentle]"}},
    4: {"mood": "delighted, no irony detected — spike then rally",
        "sent": {0: "[excited]", 1: "[warm relief]", 2: "[building panic]", 3: "[rallying, bright]", 4: "[brisk]", 5: "[confident]"}},
    5: {"mood": "motivated, presenting her recommendation with confidence",
        "sent": {0: "[confident, bright]", 1: "[matter-of-fact]", 2: "[measured, persuasive]"}},
    6: {"mood": "deferring to his guru, eager"},
    7: {"mood": "grave warning, savoring the mysticism",
        "sent": {0: "[grave]", 1: "[patient teacher]", 2: "[savoring the reveal]"}},
    8: {"mood": "explosion — incredulous betrayal", "tag": "[shocked]",
        "sent": {0: "[erupts]", 1: "[accusing]", 2: "[baffled]", 3: "[exasperated]"}},
    9: {"mood": "controlled professional pushback",
        "sent": {0: "[patient]", 1: "[dismissive of folklore]", 2: "[firm professional pride]"}},
    10: {"mood": "offended disbelief building to ominous tease",
         "sent": {0: "[incredulous]", 1: "[growling]", 2: "[ominous, teasing]"}},
    11: {"mood": "composed, slight deflection", "sent": {0: "[even]", 1: "[assured]"}},
    12: {"mood": "storyteller savoring his own folly",
         "sent": {0: "[leaning in]", 1: "[dreamy nostalgia]", 2: "[smug]", 3: "[handing off to Pedro]"}},
    13: {"mood": "solemn ghost story",
         "sent": {0: "[counting on fingers, grim]", 1: "[low, ominous]"}},
    14: {"mood": "eager, like a kid at a campfire"},
    15: {"mood": "simple, absolute certainty"},
    16: {"mood": "self-mocking punchline",
         "sent": {0: "[dramatic setup]", 1: "[proud punchline]"}},
    17: {"mood": "bewildered, trying to stay professional",
         "sent": {0: "[careful politeness]", 1: "[genuine confusion]"}},
    18: {"mood": "beaming, utterly sincere"},
    19: {"mood": "grasping for rational straws"},
    20: {"mood": "triumphant vindication rant",
         "sent": {0: "[scornful]", 1: "[accusing]", 2: "[nostalgic]", 3: "[vindicated]", 4: "[bitter]", 5: "[triumphant]"}},
    21: {"mood": "flat — the last rational hope dying"},
    22: {"mood": "brisk pivot back to boss mode",
         "sent": {0: "[dismissiveness]", 1: "[executive crispness]", 2: "[decisive]"}},
    23: {"mood": "serene oracle, no hesitation"},
    24: {"mood": "alarmed, professional panic",
         "sent": {0: "[shocked]", 1: "[rapid-fire objections]", 2: "[pleading]"}},
    25: {"mood": "serene trust, almost smug"},
    26: {"mood": "reverent, quiet power",
         "sent": {0: "[reverent]", 1: "[soft conviction]"}},
    27: {"mood": "erupting delight, gavel verdict",
         "sent": {0: "[erupts]", 1: "[awed]", 2: "[gavel verdict]"}},
    28: {"mood": "fading protest, steamrolled"},
    29: {"mood": "steamrolling momentum",
         "sent": {0: "[final]", 1: "[philosophy mode]", 2: "[executive pivot]"}},
    30: {"mood": "dutiful, relieved to be on solid ground"},
    31: {"mood": "gentle ominous intrusion"},
    32: {"mood": "wary"},
    33: {"mood": "matter-of-fact folklore professor",
         "sent": {0: "[flipping pages]", 1: "[quoting colleagues]", 2: "[stating law]"}},
    34: {"mood": "incredulous logic"},
    35: {"mood": "converted, all-in",
         "sent": {0: "[firm headmaster]", 1: "[eager student]"}},
    36: {"mood": "generous ritual instruction"},
    37: {"mood": "rapid executive acceptance"},
    38: {"mood": "sacred economics",
         "sent": {0: "[instructional]", 1: "[musical proverb]", 2: "[satisfied translation]"}},
    39: {"mood": "tasting the phrase, sold"},
    40: {"mood": "reality check, exasperation rising",
         "sent": {0: "[practical objection]", 1: "[matter-of-fact]"}},
    41: {"mood": "decree mode"},
    42: {"mood": "final ritual blessing"},
    43: {"mood": "exhausted one-word"},
    44: {"mood": "explaining a rule — flat statement of fact, NOT wishing anyone luck",
         "tag": "[flat, matter-of-fact]"},
    45: {"mood": "brisk, loving this meeting now"},
    46: {"mood": "confident launch into numbers"},
    47: {"mood": "urgent hush"},
    48: {"mood": "stopped mid-sentence, baffled"},
    49: {"mood": "two-word dread"},
    50: {"mood": "delighted pop-culture misfire"},
    51: {"mood": "patient lecture on invisible dangers",
         "sent": {0: "[calm teacher]", 1: "[explaining cause]", 2: "[hushed effect]"}},
    52: {"mood": "using their language to fight them",
         "sent": {0: "[bitter concession to the frame]", 1: "[professional exasperation]", 2: "[firm]"}},
    53: {"mood": "caught between worlds, apologetic to guru"},
    54: {"mood": "dark prophecy",
         "sent": {0: "[quiet doom]", 1: "[poetic dread]"}},
    55: {"mood": "panic creativity"},
    56: {"mood": "THE TWIST — voice change: intimate, warm, cinematic confidence",
         "sent": {0: "[settling in, storyteller]", 1: "[reverent family lore]", 2: "[quoting grandmother's rule]", 3: "[recalling the ritual, tender]", 4: "[closing the spell]"}},
    57: {"mood": "hushed, hanging on her words"},
    58: {"mood": "guiding the ritual",
         "sent": {0: "[instruction]", 1: "[warm logic]", 2: "[quiet ceremony]", 3: "[assurance]"}},
    59: {"mood": "solemn endorsement, converted",
         "sent": {0: "[solemn]", 1: "[awed]"}},
    60: {"mood": "all-in urgency"},
    61: {"mood": "inventory of wards, proud",
         "sent": {0: "[counting]", 1: "[counting]", 2: "[satisfied verdict]"}},
    62: {"mood": "handing over the ritual, warm command",
         "sent": {0: "[clean professional delivery]", 1: "[turning it over]", 2: "[gentle instruction]"}},
    63: {"mood": "speaks softly, like a prayer",
         "sent": {0: "[soft, like a prayer]", 1: "[reverent repetition]", 2: "[breaking with emotion]"}},
    64: {"mood": "satisfied priestess closing the ceremony"},
    65: {"mood": "relieved wonder"},
    66: {"mood": "final blessing",
         "sent": {0: "[one last thing]", 1: "[dressing the boss]", 2: "[mystical aphorism]"}},
    67: {"mood": "obedient and expansive, boss at his best"},
    68: {"mood": "cheerful exit",
         "sent": {0: "[delighted discovery]", 1: "[warm farewell]"}},
    69: {"mood": "calling after him, urgent pedantry"},
    70: {"mood": "testing her, gentle",
         "sent": {0: "[respectful quote]", 1: "[casual probe with an edge]"}},
    71: {"mood": "the confession — dry, cool, unbothered triumph",
         "sent": {0: "[deadpan correction]", 1: "[quiet pride]"}},
    72: {"mood": "appreciative chuckle, respect between equals"},
    73: {"mood": "playful conspiratorial wink"},
    74: {"mood": "warm, avuncular approval"},
}


def load_api_key():
    with open(ENV_PATH) as f:
        for line in f:
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ELEVENLABS_API_KEY not found in " + ENV_PATH)


def parse_dialogue(path):
    lines = []
    with open(path) as f:
        for raw in f:
            s = raw.strip()
            if not s or s.startswith("#") or s.startswith("—") or s.startswith("**"):
                continue
            if s.startswith("[") and s.endswith("]"):
                continue
            m = re.match(r"^(Gordon|Pedro|Brenda)\s*-\s*(.+)$", s)
            if m:
                # strip inline stage directions like "[watches Brenda...] "
                spoken = re.sub(r"\[[^\]]*\]\s*", "", m.group(2)).strip()
                if spoken:
                    lines.append((m.group(1), spoken))
                if len(lines) > 200:
                    break
            elif s.startswith(("Comprehension", "Personal")):
                break
    return lines


def split_sentences(text):
    parts = re.split(r"(?<=[.!?…])\s+", text.strip())
    return [p for p in parts if p]


def build_line_text(text, tag, sent_tags):
    """One line -> single render string with <break> separators and
    per-sentence intensity tags."""
    chunks = split_sentences(text)
    out = []
    for i, chunk in enumerate(chunks):
        prefix = ""
        if i == 0 and tag:
            prefix = f"{tag} "
        st = sent_tags.get(i)
        if st:
            prefix += f"{st} "
        out.append(prefix + chunk)
    return f' <break time="{BREAK_IN_LINE}s" /> '.join(out)


def tts_line(key, voice_id, text, out_path, settings):
    body = {
        "text": text,
        "model_id": MODEL,
        "output_format": OUT_FORMAT,
        "voice_settings": settings,
    }
    req = urllib.request.Request(
        f"{API}/text-to-speech/{voice_id}",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    last_err = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                audio = r.read()
            with open(out_path, "wb") as f:
                f.write(audio)
            return len(audio)
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code == 429 and attempt < 2:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    raise last_err or RuntimeError("tts failed")


def stitch(parts_and_pads, out_path):
    """parts_and_pads: list of (mp3_path, lead_pad, trail_pad)."""
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    fchunks, labels = [], []
    for i, (p, lead, trail) in enumerate(parts_and_pads):
        cmd += ["-i", p]
        fchunks.append(f"[{i}:a]adelay={int(lead*1000)}|{int(lead*1000)},"
                       f"apad=pad_dur={trail}[a{i}]")
        labels.append(f"[a{i}]")
    n = len(parts_and_pads)
    fchunks.append("".join(labels) + f"concat=n={n}:v=0:a=1[out]")
    cmd += ["-filter_complex", ";".join(fchunks), "-map", "[out]", out_path]
    subprocess.run(cmd, check=True)


def collect_parts(lines, workdir):
    parts = []
    for li, (ch, _) in enumerate(lines):
        sp = SCENE_PADS.get(li, {})
        parts.append((os.path.join(workdir, f"{li:03d}-{ch}.mp3"),
                      sp.get("lead", 0.0), sp.get("trail", PAUSE_TURN)))
    return parts


def main():
    slug = sys.argv[1] if len(sys.argv) > 1 else "superstitious-minds"
    sample = "--sample" in sys.argv
    restitch = "--restitch" in sys.argv
    only_lines = None
    if "--lines" in sys.argv:
        i = sys.argv.index("--lines")
        only_lines = {int(x) for x in sys.argv[i + 1].split(",")}

    key = load_api_key()
    cast = json.load(open(CAST_PATH))
    src = os.path.join(VAULT, SLUGS[slug])
    lines = parse_dialogue(src)
    if sample:
        lines = lines[:8]
    n_full = len(lines)

    workdir = f"/tmp/dialogue-audio/{slug}"
    os.makedirs(workdir, exist_ok=True)

    if restitch:
        parts = collect_parts(lines, workdir)
        missing = [p for p, _, _ in parts if not os.path.exists(p)]
        if missing:
            sys.exit(f"missing line files, cannot restitch: {missing[:3]}")
    else:
        todo = range(n_full)
        if only_lines is not None:
            todo = [i for i in only_lines if i < n_full]
            print(f"Retaking lines: {sorted(todo)}")
        for li in todo:
            ch, text = lines[li]
            d = DIRECTIONS.get(li, {})
            # retake mode for awkward-pause lines: no break tags, single flow
            if only_lines is not None:
                spoken = build_line_text(text, d.get("tag"), {})
            else:
                spoken = build_line_text(text, d.get("tag"), d.get("sent", {}))
            out = os.path.join(workdir, f"{li:03d}-{ch}.mp3")
            size = tts_line(key, cast[ch.upper()]["voice_id"], spoken, out,
                            VOICE_SETTINGS[ch.upper()])
            print(f"  {li:03d} {ch:7s} {size//1024:4d} KB "
                  f"{('[' + d['mood'] + ']') if d.get('mood') else ''} | {text[:56]}")
            time.sleep(0.35)
        parts = collect_parts(lines, workdir)

    if sample:
        stitched = os.path.join(workdir, "sample-stitched-v3.mp3")
    else:
        outdir = os.path.join(REPO, "public", "audio", "stories")
        os.makedirs(outdir, exist_ok=True)
        stitched = os.path.join(outdir, f"{slug}.mp3")
    stitch(parts, stitched)

    dur = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", stitched], capture_output=True, text=True
    ).stdout.strip()
    print(f"\nStitched ({float(dur):.1f}s): {stitched}")


if __name__ == "__main__":
    main()
