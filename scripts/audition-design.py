#!/usr/bin/env python3
"""
audition-design.py — Round 2: custom Voice Design candidates for the three
dialogue characters. Calls /v1/text-to-voice/design (3 previews per call),
decodes audio to ~/Desktop/el-auditions2/<CHARACTER>/, and prints a mapping
file so a winner can be saved via /v1/text-to-voice/:id/save later.

Usage:
  python3 scripts/audition-design.py            # run all designs
  python3 scripts/audition-design.py --list     # show prompts only

Requires ELEVENLABS_API_KEY in .env.local (repo root).
"""

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(REPO, ".env.local")
OUT_DIR = os.path.expanduser("~/Desktop/el-auditions2")
API = "https://api.elevenlabs.io/v1"
MODEL = "eleven_multilingual_ttv_v2"  # voice design model (v3 TTV needs paid tier for 192kbps, keep free-tier safe)

# ---------------------------------------------------------------------------
# Design prompts — per ElevenLabs recommended format:
# Native <language>. <gender>, <age>. <quality>. Persona. Emotion. Timbre/delivery.
# Dialect/intonation locked in the FIRST sentence to prevent drift.
# Two variants per character so we can compare prompt phrasings.
# ---------------------------------------------------------------------------

VARIANTS = {
    "PEDRO": {
        "A": (
            "Native Spanish (Mexican, central highlands intonation), who speaks English "
            "with a light Mexican accent — clearly a native Spanish speaker, not a "
            "gringo. Male, 45–55. Studio quality. Persona: mystical wellness advisor, "
            "ex-yoga instructor turned corporate folklore consultant. Emotion: serene, "
            "wise, quietly amused. Warm baritone, slow deliberate pacing, gently "
            "rhythmic delivery, like a meditation teacher explaining business strategy. "
            "Soft consonants, rounded vowels."
        ),
        "B": (
            "Native Spanish (Mexican, Mexico City D.F. intonation), speaking English "
            "with a soft accent — Spanish phonology audible beneath American English "
            "phrasing. Male, 50–60. Excellent quality. Persona: serene corporate shaman. "
            "Emotion: calm conviction, warm gravity. Deep, resonant, unhurried; savors "
            "words; slight pause before pronouncements. Not theatrical — the calm of a "
            "man who has never doubted a superstition in his life."
        ),
    },
    "BRENDA": {
        "A": (
            "Native English (American, General American intonation — this is a Mexican "
            "professional who trained her accent, zero Spanish features). Female, "
            "32–40. Studio quality. Persona: sharp corporate data analyst presenting "
            "to a CEO. Emotion: confident, precise, quietly wry. Clean neutral timbre "
            "with minimal vocal fry, crisp consonants, measured boardroom pacing, "
            "polished and professional."
        ),
        "B": (
            "Native English (American, polished broadcast-standard General American). "
            "Female, mid-30s. Excellent quality. Persona: analytical strategist, "
            "composed under pressure. Emotion: assured, clipped, subtle warmth "
            "underneath. Smooth mid-register timbre, almost no vocal fry, efficient "
            "rhythm, lands her points with quiet authority."
        ),
    },
    "GORDON": {
        "A": (
            "Native English (American, General American — no British, Australian, or "
            "South African features). Male, 52–62. Studio quality. Persona: American "
            "CEO, coffee-chain executive, experienced and optimistic. Emotion: "
            "enthusiastic, earnest, easily convinced. Medium-deep timbre with some age "
            "in it, brisk but warm pacing, talks with his hands energy, laughs easily."
        ),
        "B": (
            "Native English (American, neutral Midwest intonation). Male, mid-50s. "
            "Excellent quality. Persona: seasoned executive who has seen everything "
            "and believes everything. Emotion: hearty, confident, boyish under the "
            "gray hair. Warm chest voice, relaxed unhurried cadence with bursts of "
            "executive energy, natural American rasp."
        ),
    },
}

# Preview text: MUST be 100–1000 chars. Bilingual test lines included.
PREVIEW_TEXTS = {
    "PEDRO": (
        "Boss, Tuesday the thirteenth. Here in Mexico, that is our Friday the thirteenth. "
        "We do not launch on martes trece. The building will punish us. "
        "The glass fell because the corner wanted attention. Put salt on the floor and the "
        "mal de ojo cannot cross the line. Confía en mí, boss. Numbers lie, but salt never does."
    ),
    "BRENDA": (
        "Sir, foot traffic peaks on October thirteenth. That is not a feeling. That is four "
        "years of point-of-sale data. And no, we cannot move the launch to December twelfth — "
        "the budget is tres punto ocho millones de pesos, and we break even by June. "
        "I ran the numbers twice, sir. Numbers do not knock over glasses of water."
    ),
    "GORDON": (
        "Pfff. I have an MBA, Pedro. Numbers do not knock over glasses of water. "
        "Pedro, you are a wizard. Brenda, you are a spreadsheet. And today, the wizard wins. "
        "We are launching on martes trece because my gut says so, and my gut has never "
        "been wrong. Well, except Tulsa. We do not talk about Tulsa."
    ),
}


def load_api_key():
    with open(ENV_PATH) as f:
        for line in f:
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ELEVENLABS_API_KEY not found in " + ENV_PATH)


def design(key, description, text, seed):
    body = json.dumps({
        "voice_description": description,
        "text": text,
        "model_id": MODEL,
        "loudness": 0.5,
        "seed": seed,
        "guidance_scale": 5,
    }).encode()
    req = urllib.request.Request(
        f"{API}/text-to-voice/design",
        data=body,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def main():
    key = load_api_key()

    if "--list" in sys.argv:
        for ch, vs in VARIANTS.items():
            for tag, p in vs.items():
                print(f"{ch}-{tag}: {p}\n")
        return

    mapping = {}
    for ch, vs in VARIANTS.items():
        ch_dir = os.path.join(OUT_DIR, ch)
        os.makedirs(ch_dir, exist_ok=True)
        text = PREVIEW_TEXTS[ch]
        print(f"=== {ch} ({len(text)} chars preview text, billed once per call)")
        for tag, prompt in vs.items():
            seed = 42 if tag == "A" else 43
            try:
                resp = design(key, prompt, text, seed)
            except urllib.error.HTTPError as e:
                print(f"   !! {ch}-{tag} HTTP {e.code}: {e.read().decode()[:200]}")
                continue
            for i, pv in enumerate(resp.get("previews", []), 1):
                name = f"{tag}{i}"
                out = os.path.join(ch_dir, f"{name}.mp3")
                with open(out, "wb") as f:
                    f.write(base64.b64decode(pv["audio_base_64"]))
                mapping[f"{ch}-{name}"] = pv["generated_voice_id"]
                print(f"   {name}: {pv.get('duration_secs', 0):.1f}s -> {out}")
            time.sleep(1)
    with open(os.path.join(OUT_DIR, "generated-ids.json"), "w") as f:
        json.dump(mapping, f, indent=2)
    print("\nSaved generated-ids.json — pick winners, then we save them to voice slots.")


if __name__ == "__main__":
    main()
