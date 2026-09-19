#!/usr/bin/env python3
"""
audition-design4.py — Round 4 (targeted finals):
- Brenda: C1-weighted blend with C3, echo killed.
- Gordon: C2/C3 blend (slight C2 lean).
- Pedro: D2/D3 base (v3 model), accent reduced to a light touch —
  near-native neutral English, minimal L1 interference.

One design call per character -> 3 candidates each (9 total).
Output: ~/Desktop/el-auditions4/<CHARACTER>/
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
OUT_DIR = os.path.expanduser("~/Desktop/el-auditions4")
API = "https://api.elevenlabs.io/v1"

CLEAN = ("Close-mic'd studio recording, forward proximity, noise-free signal, "
         "perfect audio quality, no reverb, no echo, dry acoustic space.")

RUNS = [
    {
        "char": "PEDRO",
        "name": "PEDRO-E",
        "model": "eleven_ttv_v3",  # D batch (v3) beat C batch per Kyle's notes
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
        "char": "BRENDA",
        "name": "BRENDA-D",
        "model": "eleven_multilingual_ttv_v2",  # C batch (v2) was the winner
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
        "char": "GORDON",
        "name": "GORDON-D",
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


def main():
    key = load_api_key()
    mapping_path = os.path.expanduser("~/Desktop/el-auditions2/generated-ids.json")
    mapping = json.load(open(mapping_path)) if os.path.exists(mapping_path) else {}
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
            }
            print(f"   {name}: {pv.get('duration_secs', 0):.1f}s -> {out}")
        time.sleep(1)
    with open(mapping_path, "w") as f:
        json.dump(mapping, f, indent=2)
    print("\nRound 4 done. IDs merged into generated-ids.json.")


if __name__ == "__main__":
    main()
