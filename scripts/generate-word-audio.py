#!/usr/bin/env python3
"""
Generate TTS audio for all unique words in The Soccer Jersey story.
Uses Edge TTS (free, Microsoft's neural TTS) to create individual MP3 files
for each unique word. Files are saved to public/audio/words/.

Run: python3.11 scripts/generate-word-audio.py
"""

import asyncio
import os
import re
import sys
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv(".env.local")

import edge_tts

# ── Config ─────────────────────────────────────────────────

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "audio" / "words"
VOICE = "en-US-AriaNeural"  # Natural female voice, good for clear pronunciation
RATE = "-10%"  # Slightly slower for clarity (learners need it)

# ── Supabase fetch ──────────────────────────────────────────
# We use the publishable key (read-only) to fetch words
from supabase import create_client

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    sys.exit(1)

# ── Helpers ────────────────────────────────────────────────

def clean_for_tts(text: str) -> str:
    """Strip punctuation but keep apostrophes and hyphens for natural pronunciation."""
    # Replace curly apostrophe with straight
    text = text.replace("\u2019", "'")
    # Remove punctuation except apostrophes and hyphens
    text = re.sub(r"[^a-zA-Z0-9'\-]", "", text).strip()
    return text

def filename_for(text: str) -> str:
    """Generate a clean filename from word text."""
    clean = text.lower().replace("\u2019", "'")
    clean = re.sub(r"[^a-z0-9']", "", clean)
    return f"{clean}.mp3"

# ── Main ───────────────────────────────────────────────────

async def generate_word_audio(text: str, filepath: Path) -> bool:
    """Generate a single TTS audio file. Returns True on success."""
    try:
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(str(filepath))
        return True
    except Exception as e:
        print(f"  ERROR generating '{text}': {e}")
        return False

async def main():
    print("Fetching words from Supabase...")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get the free story
    result = supabase.table("stories").select("id").eq("is_free", True).execute()
    if not result.data:
        print("ERROR: No free story found")
        sys.exit(1)
    story_id = result.data[0]["id"]

    # Fetch all words (Supabase default limit is 1000, we have 1132)
    page1 = supabase.table("words").select("text").eq("story_id", story_id).order("position").range(0, 999).execute()
    page2 = supabase.table("words").select("text").eq("story_id", story_id).order("position").range(1000, 1999).execute()
    all_words = page1.data + page2.data

    print(f"Total word rows: {len(all_words)}")

    # Get unique words (by clean filename)
    unique_words = {}  # filename -> tts_text
    for w in all_words:
        tts_text = clean_for_tts(w["text"])
        fname = filename_for(w["text"])
        if fname and tts_text and fname not in unique_words:
            unique_words[fname] = tts_text

    print(f"Unique words to generate: {len(unique_words)}")

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Check which files already exist (skip them)
    to_generate = {}
    skipped = 0
    for fname, tts_text in unique_words.items():
        filepath = OUTPUT_DIR / fname
        if filepath.exists() and filepath.stat().st_size > 0:
            skipped += 1
        else:
            to_generate[fname] = tts_text

    print(f"Already exist (skipping): {skipped}")
    print(f"To generate: {len(to_generate)}")
    print(f"Output dir: {OUTPUT_DIR}")
    print()

    if not to_generate:
        print("All files already exist. Nothing to do.")
        return

    # Generate audio files
    success = 0
    failed = 0
    items = list(to_generate.items())

    for i, (fname, tts_text) in enumerate(items):
        filepath = OUTPUT_DIR / fname
        ok = await generate_word_audio(tts_text, filepath)
        if ok:
            success += 1
        else:
            failed += 1

        if (i + 1) % 50 == 0 or i + 1 == len(items):
            print(f"  Progress: {i + 1}/{len(items)} ({success} ok, {failed} failed)")

    print()
    print(f"Done! Generated {success} files, {failed} failures.")
    print(f"Files in: {OUTPUT_DIR}")

    # Write a JSON mapping for the Supabase update script
    import json
    mapping = {fname: f"/audio/words/{fname}" for fname in unique_words}
    mapping_path = Path(__file__).parent / "audio-mapping.json"
    with open(mapping_path, "w") as f:
        json.dump(mapping, f, indent=2)
    print(f"Audio mapping written to: {mapping_path}")

if __name__ == "__main__":
    asyncio.run(main())