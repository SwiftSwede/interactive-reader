#!/usr/bin/env python3
"""
audition-design-ad-roundD.py — Round D refinements for Angry Driving cast.

Kyle's round-C notes:
- REBECCA: C3 best. Remaining gap: not enough WARMTH — she should audibly
  love her husband. Calm + gentle + affectionate. Fix: keep C3's calm
  register, add explicit warmth/affection language ("genuinely fond of
  him," warmth in the voice when she says his name, tender teasing).
- MOTHER: C1/C2 sounded like MEN — diagnosis: "gravelly," "husky,"
  "smoky" stacked together push the design model out of the female
  register entirely. C3 stayed female but had the phone-filter again.
  Fix: describe an OLDER WOMAN first and put the roughness SECOND as a
  modifier ("aged female voice... slightly roughened"), drop "gravelly,"
  "husky," and "smoky" entirely. Phone filter diagnosis: it appeared in
  every round that used "you're/You're late" + short declaratives —
  actually more likely the word "texted" + " voicemail-like content" is
  priming message-recording context. Fix: change the preview text to
  different mother-in-law lines with the same cold personality (no
  texting/voicemail vocabulary in the audition text).

Output: ~/Desktop/el-auditions-ad/{MOTHER,REBECCA}/
Usage: python3 scripts/audition-design-ad-roundD.py
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
OUT_DIR = os.path.expanduser("~/Desktop/el-auditions-ad")
API = "https://api.elevenlabs.io/v1"

RUNS = [
    {
        "char": "MOTHER",
        "name": "MOTHER-D",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 91,
        "guidance": 5,
        "prompt": (
            "An older woman, sixty-five, unmistakably female — a mature woman's "
            "voice with age and dignity in it. Slightly roughened and weathered "
            "from age, but clearly a grandmother, not a cartoon crone. "
            "Delivery: slow, poised, and coldly elegant. She speaks the way a "
            "queen reads a verdict: unhurried, deliberate, faintly bored, with "
            "polite contempt in every pause. Zero warmth, zero excitement, zero "
            "emotional display. Quiet authority — soft volume, heavy judgment."
        ),
        "text": (
            "Beto, we talked about this. Thirty minutes late, and your wife knows "
            "exactly whose fault it is. My daughter waited by the window. "
            "Sit down, take off your jacket, and do not touch anything in this house."
        ),
    },
    {
        "char": "REBECCA",
        "name": "REBECCA-D",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 92,
        "guidance": 5,
        "prompt": (
            "A woman of thirty, warm and mature. Delivery: calm, unhurried, "
            "relaxed volume — never yelling, never rushed. "
            "Key quality: audible love. She genuinely adores her husband, and it "
            "colors everything — her teasing is affectionate, her corrections are "
            "gentle, her calm is the calm of a woman who is crazy about him. "
            "Warmth forward: soft smiles in the voice, tender patience, a hint "
            "of a laugh under the surface. Personality: gently bubbly, quietly "
            "confident, sweet but not naive, playful but never shrill. "
            "The voice of a wife holding her hot-headed husband's hand "
            "metaphorically, all the way home."
        ),
        "text": (
            "Babe. Let's calm down. How is honking gonna make traffic move faster? "
            "I'm sure everyone is in a rush, just like you. That's why they call it rush hour. "
            "Come on, my love. We'll be there soon. "
            "Beto Manuel Castillo Gonzalez. Pull over the god damn car THIS INSTANT!"
        ),
    },
]


def load_api_key():
    with open(ENV_PATH) as f:
        for line in f:
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ELEVENLABS_API_KEY not found in " + ENV_PATH)


def main():
    key = load_api_key()
    for run in RUNS:
        ch_dir = os.path.join(OUT_DIR, run["char"])
        os.makedirs(ch_dir, exist_ok=True)
        print(f"=== {run['name']} (model={run['model']}, seed={run['seed']})")
        body = json.dumps({
            "voice_description": run["prompt"],
            "text": run["text"],
            "model_id": run["model"],
            "seed": run["seed"],
            "guidance_scale": run["guidance"],
        }).encode()
        req = urllib.request.Request(
            f"{API}/text-to-voice/design",
            data=body,
            headers={"xi-api-key": key, "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.load(r)
        except urllib.error.HTTPError as e:
            print(f"   !! HTTP {e.code}: {e.read().decode()[:250]}")
            continue
        for i, pv in enumerate(resp.get("previews", []), 1):
            name = f"{run['name']}-{i}"
            out = os.path.join(ch_dir, f"{name}.mp3")
            with open(out, "wb") as f:
                f.write(base64.b64decode(pv["audio_base_64"]))
            print(f"   {name}: {pv.get('duration_secs', 0):.1f}s -> {out}")
        time.sleep(1)
    print("\nRound D done.")


if __name__ == "__main__":
    main()
