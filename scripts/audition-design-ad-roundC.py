#!/usr/bin/env python3
"""
audition-design-ad-roundC.py — Round C refinements for Angry Driving cast.

Kyle's round-B notes:
- MOTHER: B3 closest, but all round-B candidates were TOO EMOTIONAL — as
  expressive as Beto/Rebecca. Fix: cold = SLOW + FLAT. Disney-villain rhythm:
  unhurried, deliberate, each word placed like a chess move. Explicitly ban
  emotional expressiveness, ban warmth, ban energy. Keep the B3 gravel.
- REBECCA: B2 closest voice, but TOO emotional/loud/fast — she was matching
  Beto's energy ("two yins"). Fix: keep the 30yo bubbly-warm timbre but
  CALM the delivery: relaxed pace, normal conversational volume, easy
  confidence. She is the yang to Beto's volcano. Bubbly lives in her
  intonation, NOT her volume or speed.

One variable per round. Output: ~/Desktop/el-auditions-ad/{MOTHER,REBECCA}/
Usage: python3 scripts/audition-design-ad-roundC.py
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
        "name": "MOTHER-C",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 81,
        "guidance": 5,
        "prompt": (
            "A woman in her mid sixties. Low, husky, gravelly female voice with a "
            "smoky, worn texture — decades of smoking in every word. "
            "Delivery: slow, unhurried, and emotionally flat. She speaks like a "
            "Disney villain delivering a verdict — each word placed deliberately, "
            "with cold, measured pauses, dripping quiet contempt. Zero excitement, "
            "zero warmth, zero emotional expressiveness. Monotone-adjacent but "
            "menacing: the stillness is the threat. She never rushes and never "
            "raises her voice."
        ),
        "text": (
            "Beto. You're late. I texted you thirty minutes ago that I needed a hand. "
            "You can respond to your mother in Mexico in the middle of a work meeting, "
            "but you can't respond to your mother-in-law while inching along in traffic."
        ),
    },
    {
        "char": "REBECCA",
        "name": "REBECCA-C",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 82,
        "guidance": 5,
        "prompt": (
            "A woman of thirty, mature and grown. Warm, rounded, slightly husky "
            "adult-feminine timbre. "
            "Delivery: calm, relaxed, and easy — a normal conversational pace and "
            "a normal conversational volume. She never yells, never rushes, never "
            "over-emotes. Her personality shows in the melody of her intonation: "
            "gently bubbly, playfully teasing, quietly confident — the serene "
            "center of the conversation, the calm counterweight to her hot-headed "
            "husband. Think: warm smile you can hear, at speaking volume."
        ),
        "text": (
            "Babe. Let's calm down. How is honking gonna make traffic move faster? "
            "I'm sure everyone is in a rush, just like you. That's why they call it rush hour. "
            "Well, are you racist for calling Yucatecans unshowered Mayans? "
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
    print("\nRound C done.")


if __name__ == "__main__":
    main()
