#!/usr/bin/env python3
"""
audition-design-ad-roundF.py — Round F: MOTHER — kill the yell.

Kyle's round-E verdict:
- E-1/E-2: voice + cadence GOOD, no filter. But she's YELLING.
- E-2/E-3 still had the filter (so the filter persists even without volume
  words — it follows seed/previews, not prompt language; E-1 is the clean one).
- The evil is in CONTROL, not volume: "she knows every word bothers him."

Fix for round F: keep E-1's clean voice DNA (seed 91) and re-frame the
entire prompt around restrained, quiet-controlled menace. Explicitly ban
yelling/loudness. The threat model: she whispers like a knife. Keep the
verdict cadence language OUT (cadence was already good).

Two variants:
  - MOTHER-F: guidance 5 (E-1's setting, which was clean)
  - MOTHER-F2: guidance 4 (LOWER guidance = more natural, less prompt-shout)

Output: ~/Desktop/el-auditions-ad/MOTHER/
Usage: python3 scripts/audition-design-ad-roundF.py
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

PROMPT = (
    "An older woman, sixty-five, unmistakably female — a mature woman's voice "
    "with age and dignity in it, clearly a grandmother, slightly weathered by age. "
    "Delivery: calm, controlled, and quiet — she never raises her voice, not "
    "once. Every sentence is level and unhurried, delivered at a low, steady "
    "volume, like she is telling a secret that happens to be a verdict. "
    "She is an elegant, cold mother-in-law who has total control of her "
    "emotions: no anger, no energy, no drama. She does not need volume — "
    "every word she says lands precisely because she is so composed. "
    "Dry, clipped, faintly bored. The quiet ones are the dangerous ones."
)

RUNS = [
    {"char": "MOTHER", "name": "MOTHER-F", "seed": 91, "guidance": 5},
    {"char": "MOTHER", "name": "MOTHER-F2", "seed": 91, "guidance": 4},
]

TEXT = (
    "Beto, we talked about this. Thirty minutes late, and your wife knows "
    "exactly whose fault it is. My daughter waited by the window. "
    "Sit down, take off your jacket, and do not touch anything in this house."
)


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
        print(f"=== {run['name']} (seed={run['seed']}, guidance={run['guidance']})")
        body = json.dumps({
            "voice_description": PROMPT,
            "text": TEXT,
            "model_id": "eleven_multilingual_ttv_v2",
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
    print("\nRound F done. Locked so far: BETO-A-1, REBECCA-D-1.")


if __name__ == "__main__":
    main()
