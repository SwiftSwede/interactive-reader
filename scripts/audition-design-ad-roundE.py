#!/usr/bin/env python3
"""
audition-design-ad-roundE.py — Round E (final): MOTHER fine-tune only.

Kyle's round-D verdict:
- MOTHER-D-2 cadence is GOLD — natural, human, keep it untouched.
- Remaining: speaks with a bit too much energy/emotion. Needs: a little
  slower, a little calmer, a touch more harshness. DO NOT touch the cadence.
- Phone filter persists even with changed text => it's in the voice design
  itself, not the preview content. Hypothesis for this round: the filter
  correlates with "soft volume / quiet" instructions (message clips are
  quiet + close). Fix attempt: remove ALL volume language (no "soft",
  no "quiet") — let harshness imply the edge — and push the pace down.

REBECCA: LOCKED = REBECCA-D-1. No further rounds.

Output: ~/Desktop/el-auditions-ad/MOTHER/
Usage: python3 scripts/audition-design-ad-roundE.py
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

# Base: MOTHER-D-2's exact prompt (the cadence Kyle liked), with ONLY the
# pace/energy/harshness dials adjusted. Volume words removed entirely.
RUNS = [
    {
        "char": "MOTHER",
        "name": "MOTHER-E",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 91,   # D-2's seed — same voice DNA, new modifiers
        "guidance": 5,
        "prompt": (
            "An older woman, sixty-five, unmistakably female — a mature woman's "
            "voice with age and dignity in it, clearly a grandmother. Slightly "
            "roughened and weathered from age. "
            "Delivery: slower than normal conversation, with unhurried pauses "
            "between phrases — she has all the time in the world and is making "
            "everyone else feel it. Emotionally flat and controlled: no energy, "
            "no excitement, no performing. The edge in her voice is dry harshness: "
            "clipped consonants, a thin frost on every word, judgment delivered "
            "as fact. The queen reading a verdict — deliberate, certain, cold."
        ),
        "text": (
            "Beto, we talked about this. Thirty minutes late, and your wife knows "
            "exactly whose fault it is. My daughter waited by the window. "
            "Sit down, take off your jacket, and do not touch anything in this house."
        ),
    },
    {
        "char": "MOTHER",
        "name": "MOTHER-E2",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 91,
        "guidance": 7,   # higher guidance = stricter prompt adherence (slower/flatter)
        "prompt": (
            "An older woman, sixty-five, unmistakably female — a mature woman's "
            "voice with age and dignity in it, clearly a grandmother. Slightly "
            "roughened and weathered from age. "
            "Delivery: slow and heavy, half a beat slower than feels natural, "
            "with cold, deliberate pauses between every phrase. Emotionally "
            "flat and controlled: no energy, no excitement, no performing. "
            "Dry harshness in the articulation: clipped consonants, frost on "
            "every word, judgment delivered as plain fact. The queen reading "
            "a verdict — deliberate, certain, cold."
        ),
        "text": (
            "Beto, we talked about this. Thirty minutes late, and your wife knows "
            "exactly whose fault it is. My daughter waited by the window. "
            "Sit down, take off your jacket, and do not touch anything in this house."
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
        print(f"=== {run['name']} (model={run['model']}, seed={run['seed']}, guidance={run['guidance']})")
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
    print("\nRound E done. REBECCA locked = REBECCA-D-1. BETO locked = BETO-A-1.")


if __name__ == "__main__":
    main()
