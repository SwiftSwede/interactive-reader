#!/usr/bin/env python3
"""
Generate TTS audio for all unique words in a story.
Uses Edge TTS (free, Microsoft's neural TTS) to create individual MP3 files
for each unique word. Files are saved to public/audio/words/ and are SHARED
across stories (keyed by word text) — a word MP3 generated for one story is
reused by every other story, so never generate the same word twice.

Run: python3.11 scripts/generate-word-audio.py --slug <story-slug>
Then: npx tsx scripts/update-word-audio.ts --slug <story-slug>
"""

import asyncio
import json
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
# We use the SECRET key: RLS hides non-free stories from the anon key, and
# this local trusted script needs to read words for any story.
from supabase import create_client

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY")
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
    # Parse --slug argument (required)
    args = sys.argv[1:]
    if "--slug" not in args or args.index("--slug") + 1 >= len(args):
        print("Usage: python3.11 scripts/generate-word-audio.py --slug <story-slug>")
        sys.exit(1)
    slug = args[args.index("--slug") + 1]

    print(f"Fetching words for story '{slug}' from Supabase...")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get the story by slug
    result = supabase.table("stories").select("id, title").eq("slug", slug).execute()
    if not result.data:
        print(f"ERROR: No story found with slug '{slug}'")
        sys.exit(1)
    story = result.data[0]
    story_id = story["id"]
    print(f"Story: {story['title']}")

    # Fetch all words (Supabase default limit is 1000)
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

    # Get unique words (by clean filename)
    unique_words = {}  # filename -> tts_text
    for w in all_words:
        tts_text = clean_for_tts(w["text"])
        fname = filename_for(w["text"])
        if fname and tts_text and fname not in unique_words:
            unique_words[fname] = tts_text

    print(f"Unique words: {len(unique_words)}")

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Check which files already exist (skip them — shared across stories!)
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

        if (i + 1) % 50 == 0 or (i + 1 == len(items) and len(items) > 0):
            print(f"  Progress: {i + 1}/{len(items)} ({success} ok, {failed} failed)")

    if items:
        print()
        print(f"Generated {success} new files, {failed} failures.")

    # Write a JSON mapping for the Supabase update script
    # (includes ALL unique words, even pre-existing ones, so the DB update covers every word)
    mapping = {fname: f"/audio/words/{fname}" for fname in unique_words}
    mapping_path = Path(__file__).parent / "audio-mapping.json"
    with open(mapping_path, "w") as f:
        json.dump(mapping, f, indent=2)
    print(f"Audio mapping written to: {mapping_path}")

    if failed:
        print(f"WARNING: {failed} files failed. Re-run this script to retry (only failures are regenerated).")
        sys.exit(2)

if __name__ == "__main__":
    asyncio.run(main())
