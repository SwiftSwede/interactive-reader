#!/usr/bin/env python3
"""
recreate-cast.py — Recreate the Superstitious Minds voice cast from scratch.

If the three custom voice slots are ever overwritten (new cast for a new
dialogue), this script regenerates Brenda / Pedro / Gordon using the exact
winning prompts + models + seeds from the original audition sessions, then
saves them as NEW permanent voices (voice_ids will differ from the
originals — swap them into scripts/voice-cast.json).

Usage:
  python3 scripts/recreate-cast.py --design     # generate 3 candidates each -> ~/Desktop/el-recast/
  python3 scripts/recreate-cast.py --save BRENDA-2 PEDRO-1 GORDON-3   # save winners

After saving: update scripts/voice-cast.json with the new voice_ids.
Winning recipes (verified 2026-09-16, see dialogue-audio-production skill):

  BRENDA  = eleven_multilingual_ttv_v2, BRENDA-D-2  (round 4, seed 48, guidance 5)
  PEDRO   = eleven_ttv_v3,              PEDRO-G-3   (round 5, seed varies)
  GORDON  = eleven_multilingual_ttv_v2, GORDON-F-1  (round 5, seed varies)

Original permanent voice_ids (if still in account, no need to recreate):
  Brenda ijPfQ0iIweXMBVzCAg91 / Pedro XYYuPnmwhF0f9JLg8bih / Gordon lfQC9ypxd3IKzDBe9bgJ
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
OUT_DIR = os.path.expanduser("~/Desktop/el-recreate")
API = "https://api.elevenlabs.io/v1"

CLEAN = ("Close-mic\'d studio recording, forward proximity, noise-free signal, "
         "perfect audio quality, no reverb, no echo, dry acoustic space.")

RUNS = [
    {
        "char": "BRENDA",
        "name": "BRENDA-R",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 48,
        "guidance": 5,
        "prompt": (
            "Native English (American, General American intonation, strictly not "
            "British). Female, mid-30s. Persona: sharp corporate data analyst "
            "presenting to a CEO. Emotion: confident, precise, quietly wry. Smooth "
            "clean mid-register timbre, minimal vocal fry, crisp consonants, "
            "efficient boardroom rhythm, warm but authoritative — mostly the dry, "
            "clear conference-table delivery with a touch more brightness. " + CLEAN
        ),
    },
    {
        "char": "PEDRO",
        "name": "PEDRO-R",
        "model": "eleven_ttv_v3",
        "seed": 47,
        "guidance": 5,
        "prompt": (
            "Native Spanish (Mexican), speaking English at a near-native, "
            "professional level — clear, neutral American English pronunciation "
            "with only a faint Spanish warmth underneath, suitable for an English-"
            "language podcast. Male, 52-60. Persona: serene corporate shaman, "
            "ex-yoga instructor turned folklore consultant. Emotion: calm "
            "conviction, warm gravity, quietly confident. Full rich baritone, "
            "intimate present delivery — a man leaning slightly toward you at a "
            "table, unhurried, savoring words. Articulate and precise. " + CLEAN
        ),
    },
    {
        "char": "GORDON",
        "name": "GORDON-R",
        "model": "eleven_multilingual_ttv_v2",
        "seed": 49,
        "guidance": 5,
        "prompt": (
            "Native English (American, General American intonation, strictly not "
            "British or Australian). Male, 55. Persona: seasoned coffee-chain CEO, "
            "experienced and optimistic, believes everything. Emotion: hearty, "
            "enthusiastic, boyish under the gray hair. Warm chest voice with some "
            "age in it, relaxed natural cadence with bursts of executive energy, "
            "subtle American rasp, laughs easily — energetic and real like C2, "
            "grounded and warm like C3. " + CLEAN
        ),
    },
]

PREVIEW_TEXTS = {
    "BRENDA": (
        "Sir, foot traffic peaks on October thirteenth. That is not a feeling. That is four "
        "years of point-of-sale data. And no, we cannot move the launch to December twelfth — "
        "the budget is tres punto ocho millones de pesos, and we break even by June. "
        "I ran the numbers twice, sir. Numbers do not knock over glasses of water."
    ),
    "PEDRO": (
        "Boss, Tuesday the thirteenth. Here in Mexico, that is our Friday the thirteenth. "
        "We do not launch on martes trece. The building will punish us. "
        "The glass fell because the corner wanted attention. Put salt on the floor and the "
        "mal de ojo cannot cross the line. Confía en mí, boss. Numbers lie, but salt never does."
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


def design(key):
    os.makedirs(OUT_DIR, exist_ok=True)
    mapping = {}
    for run in RUNS:
        ch_dir = os.path.join(OUT_DIR, run["char"])
        os.makedirs(ch_dir, exist_ok=True)
        text = PREVIEW_TEXTS[run["char"]]
        print(f"=== {run['name']} (model={run['model']}, seed={run['seed']})")
        body = json.dumps({
            "voice_description": run["prompt"],
            "text": text,
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
            mapping[name] = {
                "generated_voice_id": pv["generated_voice_id"],
                "model": run["model"],
                "prompt": run["prompt"],
            }
            print(f"   {name}: {pv.get('duration_secs', 0):.1f}s -> {out}")
        time.sleep(1)
    with open(os.path.join(OUT_DIR, "generated-ids.json"), "w") as f:
        json.dump(mapping, f, indent=2)
    print("\nDesign done. Listen to the clips, then save winners with --save.")


def save(key, winners):
    """winners: list of NAMES from generated-ids.json, e.g. BRENDA-R-2"""
    ids = json.load(open(os.path.join(OUT_DIR, "generated-ids.json")))
    cast = {}
    for win in winners:
        ch = win.split("-")[0]
        info = ids[win]
        body = json.dumps({
            "voice_name": ch.capitalize() + " (recreated)",
            "voice_description": info.get("prompt", ""),
            "generated_voice_id": info["generated_voice_id"],
            "labels": {"character": ch.capitalize(), "dialogue_cast": "recreated"},
        }).encode()
        req = urllib.request.Request(
            f"{API}/text-to-voice",
            data=body,
            headers={"xi-api-key": key, "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.load(r)
        print(f"SAVED {ch}: voice_id {d['voice_id']} (from {win})")
        cast[ch] = {"voice_id": d["voice_id"], "from": win}
    print("\nUpdate scripts/voice-cast.json with these voice_ids.")


def main():
    key = load_api_key()
    if "--design" in sys.argv:
        design(key)
    elif "--save" in sys.argv:
        i = sys.argv.index("--save")
        save(key, sys.argv[i + 1:])
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
