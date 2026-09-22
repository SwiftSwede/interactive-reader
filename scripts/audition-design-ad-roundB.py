#!/usr/bin/env python3
"""
audition-design-ad-roundB.py — Round B refinements for Angry Driving cast.

Kyle's round-A notes:
- BETO: A1 wins outright (recipe locked). No re-design.
- MOTHER: all three had an unwanted "voice message / phone filter" coloration.
  A3 closest. Fix attempt: strip ALL recording-environment language from the
  prompt (that language is what the design model interprets as phone/telco
  coloration) and push rasp/gravel harder instead.
- REBECCA: A3 wins on personality (bubbly, emotional) but sounds ~18.
  Fix attempt: same personality, but age stated three ways + lower-register,
  huskier texture cues to pull the timbre to ~30.

One variable per candidate set. Output: ~/Desktop/el-auditions-ad/{MOTHER,REBECCA}/
Usage: python3 scripts/audition-design-ad-roundB.py
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
        "name": "MOTHER-B",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 71,
        "guidance": 5,
        # NOTE: zero recording-environment language. Round A's "studio, close-mic,
        # dry acoustic space" block is what produced the phone-filter coloration.
        "prompt": (
            "A woman in her mid sixties. Voice type: low, husky, and rough — "
            "a naturally gravelly female voice with a smoky, worn texture, the "
            "kind of voice produced by decades of loud talking and smoking. "
            "Rasp forward on every word, especially at sentence ends. "
            "Persona: the cold, judgmental mother-in-law. Imperious, unimpressed, "
            "perpetually disappointed. She speaks slowly and deliberately, with "
            "clipped, condescending authority. She never raises her voice; the "
            "gravel in her throat does all the work."
        ),
        "text": (
            "Beto. You're late. I texted you thirty minutes ago that I needed a hand. "
            "You can respond to your mother in Mexico in the middle of a work meeting, "
            "but you can't respond to your mother-in-law while inching along in traffic."
        ),
    },
    {
        "char": "REBECCA",
        "name": "REBECCA-B",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 72,
        "guidance": 5,
        # Same personality DNA as A3 (bubbly, emotional, musical). Age pushed
        # three ways (30, thirties, adult maturity) + lower-register texture.
        "prompt": (
            "A woman of thirty — a grown, mature adult woman, clearly in her "
            "thirties, with the settled warmth of a wife in her thirties, not a "
            "teenager. Voice type: light and bubbly but sitting in a slightly "
            "lower register than a young girl — warm, rounded, adult-feminine "
            "timbre with a touch of huskiness that reads as maturity. "
            "Persona: the playful, emotional wife — bright, melodic, quick-witted, "
            "dramatic in the best way, teasing when calm, surprisingly loud and "
            "fierce when angry. Musical intonation with big animated swings. "
            "No vocal fry, no corporate polish — she sounds fun, warm, and grown-up."
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
    print("\nRound B done. Update 00-LISTEN-ORDER.txt after listening.")


if __name__ == "__main__":
    main()
