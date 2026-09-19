#!/usr/bin/env python3
"""
sfx-pass.py — Sound-effects pass for dialogue audio.

Generates SFX via /v1/sound-generation (cached in public/audio/sfx/),
computes absolute offsets in the stitched dialogue timeline from the
per-line MP3s + SCENE_PADS, and mixes SFX over the dialogue with ffmpeg
amix (dialogue level untouched; SFX attenuated).

Usage: python3 scripts/sfx-pass.py superstitious-minds
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
WORKDIR = "/tmp/dialogue-audio/{slug}"
SFX_DIR = os.path.join(REPO, "public", "audio", "sfx")
API = "https://api.elevenlabs.io/v1"

# slug -> stage-direction beats (must mirror generate-dialogue-audio.py SCENE_PADS)
SCENE_PADS = {
    "superstitious-minds": {
        0: {"lead": 1.4},
        56: {"lead": 1.6},
        59: {"lead": 1.8},
        67: {"trail": 2.5},
        68: {"lead": 2.5},
        69: {"trail": 2.5},
        72: {"trail": 2.0},
    },
}

SFX_SPECS = {
    "door-glass-spill": {
        "prompt": "An office door swings open fast and hard; a glass of water topples and spills on the floor. Close, natural room.",
        "duration": 2.6,
        "volume": 0.85,
    },
    "laptop-close": {
        "prompt": "A laptop lid closing firmly with a soft plastic click, quiet office room.",
        "duration": 1.4,
        "volume": 0.8,
    },
    "glass-knock-1x": {
        "prompt": "A single short knuckle rap on a hard glass tabletop. Bright, high-pitched, crystalline tap with a brief ringing tail. Only the one tap, nothing else, no voice.",
        "duration": 1.2,
        "volume": 0.9,
        "trim_silence": True,
        "max_onsets": 1,
    },
    "wood-knock-1x": {
        "prompt": "A single slow heavy knock on a hollow wooden door frame. Deep, low, dull woody thud with no ring. Only the one knock, nothing else, no voice.",
        "duration": 1.2,
        "volume": 0.9,
        "trim_silence": True,
        "max_onsets": 1,
    },
    "office-room-tone": {
        "prompt": "Quiet modern office conference room ambience, very faint air conditioning hum, no voices.",
        "duration": 20.0,
        "volume": 0.3,
    },
}


def load_api_key():
    with open(ENV_PATH) as f:
        for line in f:
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ELEVENLABS_API_KEY not found in " + ENV_PATH)


def probe_duration(path):
    """Decoded audio duration, or None if the file is empty/undecodable."""
    try:
        out = subprocess.run(
            ["ffmpeg", "-i", path, "-f", "null", "-"],
            capture_output=True, text=True).stderr
        times = re.findall(r"time=(\d+):(\d+):(\d+\.\d+)", out)
        if times:
            h, m, s = times[-1]
            return int(h) * 3600 + int(m) * 60 + float(s)
    except Exception:
        pass
    return None


def count_onsets(path, dur):
    """Number of distinct sound bursts: internal silence intervals (excluding
    trailing) + 1."""
    out = subprocess.run(
        ["ffmpeg", "-i", path, "-af", "silencedetect=noise=-30dB:d=0.08",
         "-f", "null", "-"], capture_output=True, text=True).stderr
    ivals = [(float(s), float(e)) for s, e in zip(
        re.findall(r"silence_start: ([0-9.]+)", out),
        re.findall(r"silence_end: ([0-9.]+)", out))]
    internal = [iv for iv in ivals if iv[1] < dur - 0.05]
    return len(internal) + 1


def trim_lead(path):
    """Trim leading silence so the clip starts on the first transient."""
    tmp = path + ".trim.mp3"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path,
                    "-af", "silenceremove=start_periods=1:start_threshold=-45dB",
                    tmp], check=True)
    os.replace(tmp, path)


def ensure_sfx(key):
    os.makedirs(SFX_DIR, exist_ok=True)
    for name, spec in SFX_SPECS.items():
        out = os.path.join(SFX_DIR, f"{name}.mp3")
        if os.path.exists(out) and os.path.getsize(out) > 10000:
            print(f"  cache hit: {name}.mp3 ({probe_duration(out):.1f}s)")
            continue
        attempts = 3
        want = spec.get("max_onsets")
        for attempt in range(1, attempts + 1):
            body = json.dumps({
                "text": spec["prompt"],
                "duration_seconds": spec["duration"],
            }).encode()
            req = urllib.request.Request(
                f"{API}/sound-generation",
                data=body,
                headers={"xi-api-key": key, "Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    audio = r.read()
                with open(out, "wb") as f:
                    f.write(audio)
            except urllib.error.HTTPError as e:
                sys.exit(f"SFX generation failed for {name}: HTTP {e.code} "
                         f"{e.read().decode()[:200]}")
            if spec.get("trim_silence"):
                trim_lead(out)
            dur = probe_duration(out)
            if dur is None or dur < 0.3:
                print(f"  attempt {attempt}: {name} came back empty/silent, regenerating")
                os.remove(out)
                time.sleep(1)
                continue
            onsets = count_onsets(out, dur)
            if want is None or onsets == want:
                print(f"  generated: {name}.mp3 ({dur:.1f}s, {onsets} onsets)"
                      f"{' attempt ' + str(attempt) if attempt > 1 else ''}")
                break
            print(f"  attempt {attempt}: {name} has {onsets} onsets (want {want}), regenerating")
            time.sleep(1)
        else:
            print(f"  !! {name}: could not get exactly {want} onsets after "
                  f"{attempts} tries — keeping best take, review manually")
        time.sleep(0.5)


def detect_gaps(bed_path, min_len=1.2):
    """Real silence intervals in the final bed via silencedetect.
    Returns [(start, end, dur), ...] sorted by time."""
    out = subprocess.run(
        ["ffmpeg", "-i", bed_path, "-af",
         f"silencedetect=noise=-45dB:d={min_len}", "-f", "null", "-"],
        capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
    return [(s, e, e - s) for s, e in zip(starts, ends)]


def main():
    slug = sys.argv[1] if len(sys.argv) > 1 else "superstitious-minds"
    key = load_api_key()

    # Always rebuild a clean dialogue bed first — never mix over a file that
    # already has SFX (the pass must be idempotent).
    subprocess.run(["python3", os.path.join(REPO, "scripts",
                   "generate-dialogue-audio.py"), slug, "--restitch"], check=True)

    print("=== SFX assets")
    ensure_sfx(key)

    dialogue = os.path.join(REPO, "public", "audio", "stories", f"{slug}.mp3")
    if not os.path.exists(dialogue):
        sys.exit("stitched dialogue missing — run generate-dialogue-audio.py first")
    total = probe_duration(dialogue)

    print("dialogue bed decoded; detecting real silence landmarks...")
    bed = dialogue  # stitched bed before mixing
    gaps = detect_gaps(bed, min_len=1.2)
    print(f"  {len(gaps)} silence gaps >= 1.2s found")

    def gap_near(t, tol=6.0):
        """Closest detected gap to expected time t (within tol seconds)."""
        best, bd = None, tol
        for g in gaps:
            d = abs(g[0] - t)
            if d < bd:
                best, bd = g, d
        return best

    # Expected anchor times (approximate, from scene-pad structure):
    # first gap = the door-spill lead before line 0; the twist lead; the
    # watching lead; the 5.0s knock window; the 2.5s gathering gap.
    expected = {
        "door": 0.0,        # very start
        "laptop": None,     # resolved below via knock-window ordering
        "knocks": None,
        "gathering": None,
    }
    # Identify the knock window: the LONGEST gap (5.0s by design).
    long_gaps = sorted(gaps, key=lambda g: -g[2])
    knock_gap = long_gaps[0] if long_gaps else None
    if knock_gap is None:
        sys.exit("no silence gaps detected — bed has no scene pauses?")
    print(f"  knock window: {knock_gap[0]:.2f}-{knock_gap[1]:.2f}s "
          f"({knock_gap[2]:.2f}s)")

    # The gathering gap: the longest gap AFTER the knock window.
    after = [g for g in gaps if g[0] > knock_gap[1] + 1]
    gather_gap = max(after, key=lambda g: g[2]) if after else None
    # Gaps before the knock window, in time order: by design these are
    # [door lead, laptop/twist lead, watching lead] — laptop is second-to-last.
    before = sorted([g for g in gaps if g[1] < knock_gap[0] - 1], key=lambda g: g[0])
    laptop_gap = before[-2] if len(before) >= 2 else (before[-1] if before else None)
    print("  all gaps:", [(round(g[0], 1), round(g[2], 1)) for g in gaps])

    placements = [("door-glass-spill", 0.4)]
    if laptop_gap:
        placements.append(("laptop-close", laptop_gap[1] - 1.3))
        print(f"  laptop gap: {laptop_gap[0]:.2f}-{laptop_gap[1]:.2f}s")
    if knock_gap:
        # Single-knock clips placed twice each: glass pair early in the
        # window, wood pair late. Real onsets (post-trim) land on these times.
        w0, w1 = knock_gap[0], knock_gap[1]
        placements += [
            ("glass-knock-1x", w0 + 0.25),
            ("glass-knock-1x", w0 + 1.10),
            ("wood-knock-1x", w1 - 1.55),
            ("wood-knock-1x", w1 - 0.70),
        ]
    if gather_gap:
        placements.append(("office-room-tone", gather_gap[0] - 0.3))
        print(f"  gathering gap: {gather_gap[0]:.2f}-{gather_gap[1]:.2f}s")

    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", dialogue]
    chains, mix_labels = [], ["[0:a]"]
    for i, (name, at) in enumerate(placements, 1):
        cmd += ["-i", os.path.join(SFX_DIR, f"{name}.mp3")]
        vol = SFX_SPECS[name]["volume"]
        fade = ",afade=t=in:d=0.8" if name == "office-room-tone" else ""
        chains.append(
            f"[{i}:a]volume={vol}{fade},adelay={int(at*1000)}|{int(at*1000)}[s{i}]")
        mix_labels.append(f"[s{i}]")
        print(f"  {name:24s} @ {at:7.2f}s (vol {vol})")
    n = len(placements) + 1
    chains.append("".join(mix_labels) + f"amix=inputs={n}:normalize=0:duration=longest[out]")
    cmd += ["-filter_complex", ";".join(chains), "-map", "[out]", "-t", f"{total:.2f}",
            dialogue + ".tmp.mp3"]
    subprocess.run(cmd, check=True)
    os.replace(dialogue + ".tmp.mp3", dialogue)

    print(f"\nMixed: {dialogue} ({probe_duration(dialogue):.1f}s)")


if __name__ == "__main__":
    main()
