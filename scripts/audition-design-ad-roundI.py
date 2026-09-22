#!/usr/bin/env python3
"""
audition-design-ad-roundI.py — Round I: The Snape Brief.

Kyle's north star, finally explicit: PROFESSOR SNAPE, but a 60-year-old
American woman from Los Angeles. Not "cold grandmother." Not "bully
described by behavior." The actual reference: Alan Rickman's Snape —
the slow, silken, low, deliberate drawl; velvet menace; dramatic pauses;
each syllable released reluctantly, like giving up something valuable;
soft-spoken contempt; the sense that he is always slightly bored by
inferior people.

Design implications (this is why previous rounds failed):
- Snape's voice is LOW and SILKEN, not raspy/gravelly — every rasp/husk/
  gravel word in previous prompts pushed us away from the target.
- Snape speaks SLOWLY with DRAMATIC PAUSES — cadence must be prescribed.
- Snape's menace is in the DRAWL and the precision, not volume.
- The LA note: American accent, slight Californian smoothness.

Strategy: two prompt variants (Snape-transposed, Snape-transposed+LA),
both with pause-marked preview text so the cadence is demonstrated in
the audition itself, not just described.

Output: ~/Desktop/el-auditions-ad/MOTHER/
Usage: python3 scripts/audition-design-ad-roundI.py
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

SNAKE_CORE = (
    "Voice reference: the late Alan Rickman's Professor Snape — but a woman. "
    "An American woman around sixty from Los Angeles. Low, silken female "
    "voice with a slow, velvety drawl. She speaks deliberately, releasing "
    "each word reluctantly, as if every syllable costs her something. "
    "Frequent dramatic pauses, especially before the word that hurts. "
    "Soft-spoken and unhurried, with polished, precise diction — every "
    "consonant placed like a scalpel. Quiet, ironic contempt; velvet menace. "
    "Never warm, never hurried, never loud, never gravelly — smooth as "
    "silk the whole way through. The most frightening thing about her is "
    "how calm she always is."
)

RUNS = [
    {
        "char": "MOTHER",
        "name": "MOTHER-H",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 101,
        "guidance": 5,
        "prompt": SNAKE_CORE,
        "text": (
            "Beto. <break time=\"0.7s\" /> You're late. "
            "<break time=\"0.7s\" /> I texted you thirty minutes ago. "
            "<break time=\"0.7s\" /> But of course... your phone is for your mother in Mexico. "
            "<break time=\"0.8s\" /> Not for your mother-in-law... who is standing on the freeway."
        ),
    },
    {
        "char": "MOTHER",
        "name": "MOTHER-H2",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 102,
        "guidance": 5,
        "prompt": SNAKE_CORE + (
            " Slight Los Angeles softness in the vowels — an American accent "
            "with the coastal smoothness of old-money Southern California."
        ),
        "text": (
            "Beto. <break time=\"0.7s\" /> You're late. "
            "<break time=\"0.7s\" /> I texted you thirty minutes ago. "
            "<break time=\"0.7s\" /> But of course... your phone is for your mother in Mexico. "
            "<break time=\"0.8s\" /> Not for your mother-in-law... who is standing on the freeway."
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
    print("\nRound I (Snape brief) done.")


if __name__ == "__main__":
    main()
