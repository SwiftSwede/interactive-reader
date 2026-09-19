#!/usr/bin/env python3
"""
audition-casting.py — Free voice audition round for dialogue characters.

Renders the same audition lines with multiple ElevenLabs stock voices,
so the teacher can listen and pick a cast before any custom Voice Design.

Usage:
  python3 scripts/audition-casting.py            # render all auditions
  python3 scripts/audition-casting.py --list     # just show cast plan

Output: ~/Desktop/el-auditions/<CHARACTER>/<voice-name>-<n>.mp3

Requires ELEVENLABS_API_KEY in .env.local (repo root).
Uses model eleven_multilingual_v2 (available on the free tier).
Audition text: real lines from "Superstitious Minds" (int dialogue).
"""

import json
import os
import sys
import time
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(REPO, ".env.local")
OUT_DIR = os.path.expanduser("~/Desktop/el-auditions")
API = "https://api.elevenlabs.io/v1"

# ---------------------------------------------------------------------------
# Cast plan: character -> audition lines + candidate stock voice IDs.
# Voice IDs resolved live from /v1/voices at runtime (free call), so only
# names are hardcoded here.
# ---------------------------------------------------------------------------

CHARACTERS = {
    "PEDRO": {
        "desc": "Mexican folklore advisor, mystical, calm, says 'boss'",
        "voice_candidates": ["Callum", "George", "Brian"],
        "lines": [
            "Boss, Tuesday the thirteenth. Here in Mexico, that is our Friday the thirteenth. We do not launch on martes trece. The building will punish us.",
            "The glass fell because the corner wanted attention. I put salt on the floor, and suddenly, silence. The evil eye cannot cross a line of salt.",
        ],
    },
    "BRENDA": {
        "desc": "Mexican data analyst, facts and KPIs, says 'sir', owns the twist",
        "voice_candidates": ["Sarah", "Alice", "Jessica"],
        "lines": [
            "Sir, foot traffic peaks on October thirteenth. That is not a feeling. That is four years of point-of-sale data.",
            "Gordon, my grandmother sold insurance in Monterrey, not tamales. I made the ritual up on the spot, so you would say your numbers out loud.",
        ],
    },
    "GORDON": {
        "desc": "Gringo American CEO, casual register (tryna/gonna/gonna), the true believer",
        "voice_candidates": ["Charlie", "Adam", "Chris"],
        "lines": [
            "Pfff. I have an MBA, Pedro. Numbers do not knock over glasses of water.",
            "Pedro, you are a wizard. Brenda, you are... a spreadsheet. And today, the wizard wins.",
        ],
    },
}

MODEL = "eleven_multilingual_v2"  # free-tier compatible, best quality for this


def load_api_key():
    with open(ENV_PATH) as f:
        for line in f:
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ELEVENLABS_API_KEY not found in " + ENV_PATH)


def api_get_json(key, path):
    req = urllib.request.Request(f"{API}{path}", headers={"xi-api-key": key})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def tts(key, voice_id, text, out_path):
    body = json.dumps({
        "text": text,
        "model_id": MODEL,
        "output_format": "mp3_44100_128",
    }).encode()
    req = urllib.request.Request(
        f"{API}/text-to-speech/{voice_id}",
        data=body,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        audio = r.read()
    with open(out_path, "wb") as f:
        f.write(audio)
    return len(audio)


def main():
    key = load_api_key()
    voices = api_get_json(key, "/voices")["voices"]
    by_name = {v["name"].split(" - ")[0].strip(): v["voice_id"] for v in voices}

    if "--list" in sys.argv:
        for ch, spec in CHARACTERS.items():
            print(f"\n{ch} — {spec['desc']}")
            for name in spec["voice_candidates"]:
                print(f"   {name:10s} id={by_name.get(name, 'MISSING')}")
        return

    total_chars = sum(
        len(ln) for spec in CHARACTERS.values() for ln in spec["lines"]
    )
    n_clips = sum(len(spec["voice_candidates"]) * len(spec["lines"])
                  for spec in CHARACTERS.values())
    print(f"Rendering {n_clips} clips, ~{total_chars} characters of credit "
          f"(per voice repetition: {total_chars * 3} total)\n")

    for ch, spec in CHARACTERS.items():
        ch_dir = os.path.join(OUT_DIR, ch)
        os.makedirs(ch_dir, exist_ok=True)
        print(f"=== {ch} ({spec['desc']})")
        for i, name in enumerate(spec["voice_candidates"], 1):
            vid = by_name.get(name)
            if not vid:
                print(f"   !! voice '{name}' not in library, skipping")
                continue
            for j, line in enumerate(spec["lines"], 1):
                out = os.path.join(ch_dir, f"{i:02d}-{name}-line{j}.mp3")
                size = tts(key, vid, line, out)
                print(f"   {name:10s} line{j}: {size//1024} KB -> {out}")
                time.sleep(0.5)  # be polite to rate limits
    print("\nDone. Listen in ~/Desktop/el-auditions/ and pick one voice per character.")


if __name__ == "__main__":
    main()
