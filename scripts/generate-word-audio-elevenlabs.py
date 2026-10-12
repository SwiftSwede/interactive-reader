#!/usr/bin/env python3
"""
ElevenLabs fallback for generate-word-audio.py (Edge TTS gets 403'd sometimes).
Same behavior: one MP3 per unique word in public/audio/words/, shared across
stories, keyed by word text; skips words already on disk; writes audio-mapping.json.

Uses the ELEVENLABS_API_KEY from .env.local. Model: eleven_turbo_v2_5
(good quality, ~0.5 credits/char — 150 words costs well under 1,000 credits).

Run: .venv/bin/python3.11 scripts/generate-word-audio-elevenlabs.py --slug <story-slug>
Then: npx tsx scripts/update-word-audio.ts --slug <story-slug>
"""

import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(".env.local")

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "audio" / "words"
API_KEY = os.environ.get("ELEVENLABS_API_KEY")
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel: American English female, clear
MODEL_ID = "eleven_turbo_v2_5"

if not API_KEY:
    print("ERROR: Missing ELEVENLABS_API_KEY in .env.local")
    sys.exit(1)

from supabase import create_client

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY")
    sys.exit(1)


def clean_for_tts(text: str) -> str:
    text = text.replace("\u2019", "'")
    text = re.sub(r"[^a-zA-Z0-9'\-]", "", text).strip()
    return text


def filename_for(text: str) -> str:
    clean = text.lower().replace("\u2019", "'")
    clean = re.sub(r"[^a-z0-9']", "", clean)
    return f"{clean}.mp3"


def generate_word_audio(text: str, filepath: Path) -> bool:
    """Synthesize one word via the ElevenLabs TTS REST API."""
    url = (
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
        f"?output_format=mp3_44100_128"
    )
    payload = json.dumps({
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": 0.9},
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "xi-api-key": API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()
            if len(data) > 500:
                filepath.write_bytes(data)
                return True
        except Exception as e:
            print(f"  ERROR generating '{text}' (attempt {attempt + 1}): {e}")
            time.sleep(2 * (attempt + 1))
    return False


def main():
    args = sys.argv[1:]
    if "--slug" not in args or args.index("--slug") + 1 >= len(args):
        print("Usage: python3.11 scripts/generate-word-audio-elevenlabs.py --slug <story-slug>")
        sys.exit(1)
    slug = args[args.index("--slug") + 1]

    print(f"Fetching words for story '{slug}' from Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    result = supabase.table("stories").select("id, title").eq("slug", slug).execute()
    if not result.data:
        print(f"ERROR: No story found with slug '{slug}'")
        sys.exit(1)
    story = result.data[0]
    story_id = story["id"]
    print(f"Story: {story['title']}")

    all_words = []
    for start in range(0, 10000, 1000):
        page = (
            supabase.table("words")
            .select("text")
            .eq("story_id", story_id)
            .order("position")
            .range(start, start + 999)
            .execute()
        )
        if not page.data:
            break
        all_words.extend(page.data)
        if len(page.data) < 1000:
            break

    print(f"Total word rows: {len(all_words)}")
    if not all_words:
        print("ERROR: Story has no word rows. Run annotate-story.ts first.")
        sys.exit(1)

    unique_words = {}
    for w in all_words:
        tts_text = clean_for_tts(w["text"])
        fname = filename_for(w["text"])
        if fname and tts_text and fname not in unique_words:
            unique_words[fname] = tts_text

    print(f"Unique words: {len(unique_words)}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    to_generate = {}
    skipped = 0
    for fname, tts_text in unique_words.items():
        filepath = OUTPUT_DIR / fname
        if filepath.exists() and filepath.stat().st_size > 0:
            skipped += 1
        else:
            to_generate[fname] = tts_text

    print(f"Already on disk (reusing): {skipped}")
    print(f"To generate: {len(to_generate)}")
    print(f"Output dir: {OUTPUT_DIR}")
    print()

    success = 0
    failed = 0
    items = list(to_generate.items())
    for i, (fname, tts_text) in enumerate(items):
        filepath = OUTPUT_DIR / fname
        if generate_word_audio(tts_text, filepath):
            success += 1
        else:
            failed += 1
        if (i + 1) % 25 == 0 or (i + 1 == len(items) and len(items) > 0):
            print(f"  Progress: {i + 1}/{len(items)} ({success} ok, {failed} failed)")
        time.sleep(0.25)  # stay polite on the API

    if items:
        print()
        print(f"Generated {success} new files, {failed} failures.")

    mapping = {fname: f"/audio/words/{fname}" for fname in unique_words}
    mapping_path = Path(__file__).parent / "audio-mapping.json"
    with open(mapping_path, "w") as f:
        json.dump(mapping, f, indent=2)
    print(f"Audio mapping written to: {mapping_path}")

    if failed:
        print(f"WARNING: {failed} files failed. Re-run this script to retry (only failures are regenerated).")
        sys.exit(2)


if __name__ == "__main__":
    main()
