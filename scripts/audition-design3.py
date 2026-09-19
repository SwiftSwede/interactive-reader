#!/usr/bin/env python3
"""
audition-design3.py — Round 3: fixes from Kyle's round-2 notes.
- Pedro: blend of B1/B3, explicitly killing phone/speaker coloration.
- Brenda: B3 direction minus "broadcast" (which pulled B2 British).
- Gordon: A1 direction, de-robotized.
One candidate per character except Pedro (2: v2 model vs v3 model).

Output: ~/Desktop/el-auditions3/<CHARACTER>/<name>.mp3
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
OUT_DIR = os.path.expanduser("~/Desktop/el-auditions3")
API = "https://api.elevenlabs.io/v1"

# Anti-filter block, reused across prompts (from ElevenLabs' own docs advice
# on forward proximity + explicit quality, and avoiding FX-adjacent words).
CLEAN = ("Close-mic'd studio recording, forward proximity, noise-free signal, "
         "perfect audio quality, no reverb, no echo, dry acoustic space.")

RUNS = [
    {
        "name": "PEDRO-C",
        "model": "eleven_multilingual_ttv_v2",
        "guidance": 4,
        "seed": 44,
        "prompt": (
            "Native Spanish (Mexican, Mexico City intonation), speaking English with "
            "a soft Mexican accent. Male, 52-60. Persona: serene corporate shaman, "
            "ex-yoga instructor turned folklore consultant. Emotion: calm conviction, "
            "warm gravity, quietly confident. Full, rich baritone with present, "
            "intimate presence — the voice of a man leaning slightly toward you at a "
            "table, unhurried, savoring words. Smooth and confident, never humble or "
            "hesitant. " + CLEAN
        ),
    },
    {
        "name": "PEDRO-D",
        "model": "eleven_ttv_v3",
        "guidance": 4,
        "seed": 44,
        "prompt": (
            "Native Spanish (Mexican, Mexico City intonation), speaking English with "
            "a soft Mexican accent. Male, 52-60. Persona: serene corporate shaman, "
            "ex-yoga instructor turned folklore consultant. Emotion: calm conviction, "
            "warm gravity, quietly confident. Full, rich baritone with present, "
            "intimate presence — the voice of a man leaning slightly toward you at a "
            "table, unhurried, savoring words. Smooth and confident, never humble or "
            "hesitant. " + CLEAN
        ),
    },
    {
        "name": "BRENDA-C",
        "model": "eleven_multilingual_ttv_v2",
        "guidance": 4,
        "seed": 45,
        "prompt": (
            "Native English (American, General American intonation, strictly not "
            "British). Female, mid-30s. Persona: sharp corporate data analyst "
            "presenting to a CEO. Emotion: confident, precise, quietly wry. Smooth "
            "mid-register timbre, minimal vocal fry, crisp consonants, efficient "
            "boardroom rhythm, lands her points with quiet authority. Natural and "
            "human, like a bright colleague across a conference table. " + CLEAN
        ),
    },
    {
        "name": "GORDON-C",
        "model": "eleven_multilingual_ttv_v2",
        "guidance": 4,
        "seed": 46,
        "prompt": (
            "Native English (American, General American intonation, strictly not "
            "British or Australian). Male, 55. Persona: seasoned coffee-chain CEO, "
            "experienced and optimistic, believes everything. Emotion: hearty, "
            "enthusiastic, boyish under the gray hair. Warm chest voice with some "
            "age in it, relaxed cadence with bursts of executive energy, natural "
            "American rasp, laughs easily. Sounds like a real person talking in a "
            "room, not an announcer reading a script. " + CLEAN
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
    mapping = {}
    for run in RUNS:
        ch = run["name"].split("-")[0]
        ch_dir = os.path.join(OUT_DIR, ch)
        os.makedirs(ch_dir, exist_ok=True)
        text = PREVIEW_TEXTS[ch]
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
    path = os.path.join(OUT_DIR, "generated-ids.json")
    if os.path.exists(path):
        old = json.load(open(path))
        old.update(mapping)
        mapping = old
    with open(path, "w") as f:
        json.dump(mapping, f, indent=2)
    print("\nRound 3 done. IDs merged into generated-ids.json.")


if __name__ == "__main__":
    main()
