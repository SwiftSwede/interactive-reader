#!/usr/bin/env python3
"""
audition-stock-angry-driving.py — B stock-voice audition pack for Angry Driving.

Generates 4 Rebecca candidates (older, bright, zero vocal fry — "dumb blonde
done right," Elle Woods energy, NOT breathy) and 3 Mother candidates
(60s, ice-cold authority, the disappointed judge) using ElevenLabs STOCK
voices. Stock voices are rendered via normal TTS with a per-line style
prompt — they do NOT consume or overwrite the 3 custom voice slots.

Output: ~/Desktop/el-auditions-ad/ with one MP3 per candidate, all speaking
the same Rebecca lines / Mother line so comparison is apples-to-apples.

Usage: python3 scripts/audition-stock-angry-driving.py
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

# Rebecca sample lines (calm coach + the eruption, the two poles she must hit)
REBECCA_LINES = [
    "Babe. Let's calm down. How is honking gonna make traffic move faster?",
    "I'm sure everyone is in a rush, just like you. That's why they call it rush hour.",
    "Beto Manuel Castillo Gonzalez. Pull over the god damn car THIS INSTANT!",
]

# Mother line (the ice-cold button)
MOTHER_LINE = (
    "Beto. You're late. I texted you 30 minutes ago that I needed a hand. "
    "You can respond to your mother in Mexico in the middle of a work meeting, "
    "but you can't respond to your mother-in-law while inching along in traffic."
)

# Stock voice_ids pulled live from GET /v1/voices (verified 2026-09-22).
# Rebecca candidates: American females, none breathy-default.
REBECCA_CANDIDATES = [
    ("R1-matilda", "XrExE9yKIg1WjnnlVkGX"),   # upbeat professional, middle-aged
    ("R2-bella",   "hpp4J3VqNfWAUOO0d1Us"),   # bright professional, middle-aged
    ("R3-sarah",   "EXAVITQu4vr4xnSDxMaL"),   # mature reassuring, young-ish
    ("R4-laura",   "FGY2WhTYpPnrIDTdsKH5"),   # sassy/quirky — wildcard
]
MOTHER_CANDIDATES = [
    ("M1-bella",   "hpp4J3VqNfWAUOO0d1Us"),
    ("M2-sarah",   "EXAVITQu4vr4xnSDxMaL"),
    ("M3-lily",    "pFZP5JQG7iQjIQuC4Bku"),   # British — audition anyway for contrast
]

# v3 style directions appended before each line
REBECCA_TAGS = ["[calm]", "[wry]", "[erupts]"]
MOTHER_TAGS = ["[cold, deliberate]"]


def load_api_key():
    with open(ENV_PATH) as f:
        for line in f:
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ELEVENLABS_API_KEY not found in " + ENV_PATH)


def tts(key, voice_id, text, out_path):
    body = json.dumps({
        "text": text,
        "model_id": "eleven_v3",
        "output_format": "mp3_44100_128",
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.80},
    }).encode()
    req = urllib.request.Request(
        f"{API}/text-to-speech/{voice_id}",
        data=body,
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                audio = r.read()
            with open(out_path, "wb") as f:
                f.write(audio)
            return len(audio)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 2:
                time.sleep(5 * (attempt + 1))
                continue
            raise


def main():
    key = load_api_key()
    os.makedirs(OUT_DIR, exist_ok=True)

    for name, vid in REBECCA_CANDIDATES:
        for i, (line, tag) in enumerate(zip(REBECCA_LINES, REBECCA_TAGS)):
            out = os.path.join(OUT_DIR, f"{name}-line{i}.mp3")
            size = tts(key, vid, f"{tag} {line}", out)
            print(f"{name} line{i} ({tag}): {size//1024} KB -> {out}")
            time.sleep(0.4)

    for name, vid in MOTHER_CANDIDATES:
        for i, (line, tag) in enumerate(zip([MOTHER_LINE], MOTHER_TAGS)):
            out = os.path.join(OUT_DIR, f"{name}-mother.mp3")
            size = tts(key, vid, f"{tag} {line}", out)
            print(f"{name} mother: {size//1024} KB -> {out}")
            time.sleep(0.4)

    print(f"\nDone. Listen in {OUT_DIR} and pick one R-candidate and one M-candidate.")
    print("Tell Kyle's agent the winners; they go into voice-cast.json casts.angry-driving.")


if __name__ == "__main__":
    main()
