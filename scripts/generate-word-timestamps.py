#!/usr/bin/env python3
"""
Run Whisper on Kyle's story recording to get word-level timestamps.
Outputs JSON with word segments that map to the story's word positions.

Run: python3.11 scripts/generate-word-timestamps.py
"""

import json
import os
import re
import sys
from pathlib import Path

import whisper

# ── Config ─────────────────────────────────────────────────

AUDIO_PATH = Path(__file__).parent.parent / "public" / "audio" / "stories" / "pre-int-story-the-soccer-jersey.mp3"
OUTPUT_PATH = Path(__file__).parent / "word-timestamps.json"
MODEL = "base"  # base is fast and good enough for clear single-speaker English

# ── Helpers ────────────────────────────────────────────────

def clean_word(text: str) -> str:
    """Normalize a word for matching: lowercase, strip punctuation, normalize curly quotes."""
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = re.sub(r"[^a-zA-Z0-9'\-]", "", text).lower()
    return text

# ── Main ───────────────────────────────────────────────────

def main():
    if not AUDIO_PATH.exists():
        print(f"ERROR: Audio file not found at {AUDIO_PATH}")
        sys.exit(1)

    print(f"Audio file: {AUDIO_PATH}")
    print(f"File size: {AUDIO_PATH.stat().st_size / 1024 / 1024:.1f} MB")
    print(f"Loading Whisper model '{MODEL}'...")
    
    model = whisper.load_model(MODEL)
    
    print("Transcribing with word-level timestamps...")
    result = model.transcribe(
        str(AUDIO_PATH),
        word_timestamps=True,
        # We want the literal transcription, no translation
        task="transcribe",
        # English only, no auto-detect
        language="en",
        # Lower temperature for more accurate transcription
        temperature=0.0,
    )

    # Extract word-level segments
    whisper_words = []
    for segment in result["segments"]:
        if "words" not in segment:
            continue
        for w in segment["words"]:
            whisper_words.append({
                "text": w["word"].strip(),
                "start": round(w["start"], 3),
                "end": round(w["end"], 3),
            })

    print(f"\nWhisper found {len(whisper_words)} word segments")
    print(f"Audio duration: {whisper_words[-1]['end']:.1f}s" if whisper_words else "No words found")

    # Show first 10 words
    print("\nFirst 10 words:")
    for w in whisper_words[:10]:
        print(f"  {w['start']:.2f}-{w['end']:.2f}s: '{w['text']}'")

    # Save raw Whisper output
    with open(OUTPUT_PATH, "w") as f:
        json.dump(whisper_words, f, indent=2)
    print(f"\nRaw timestamps saved to: {OUTPUT_PATH}")

    # Now we need to align these with the story's word positions.
    # The story has 1132 words (by whitespace split). Whisper might have
    # different segmentation (merged/split words). We do fuzzy matching.
    
    # Load story body text from Supabase to get the word list
    from dotenv import load_dotenv
    load_dotenv(".env.local")
    from supabase import create_client
    
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("\nWARNING: No Supabase env vars. Skipping alignment. Raw timestamps saved.")
        return
    
    supabase = create_client(supabase_url, supabase_key)
    
    # Get story body text
    story_result = supabase.table("stories").select("body_text").eq("is_free", True).execute()
    if not story_result.data:
        print("ERROR: No free story found")
        sys.exit(1)
    
    body_text = story_result.data[0]["body_text"]
    story_tokens = body_text.split()
    story_tokens = [t for t in story_tokens if t.strip()]
    
    print(f"\nStory has {len(story_tokens)} tokens")
    
    # Clean both sides for matching
    story_clean = [clean_word(t) for t in story_tokens]
    whisper_clean = [clean_word(w["text"]) for w in whisper_words]
    
    # Greedy alignment: walk through both lists, matching words
    aligned = []
    si = 0  # story token index
    wi = 0  # whisper word index
    
    while si < len(story_clean) and wi < len(whisper_clean):
        s_word = story_clean[si]
        w_word = whisper_clean[wi]
        
        if s_word == w_word:
            # Exact match
            aligned.append({
                "position": si,
                "text": story_tokens[si],
                "start": whisper_words[wi]["start"],
                "end": whisper_words[wi]["end"],
            })
            si += 1
            wi += 1
        elif not w_word:
            # Empty whisper word, skip
            wi += 1
        elif not s_word:
            # Empty story token, skip
            si += 1
        elif w_word in s_word or s_word in w_word:
            # Partial match (e.g. "dont" vs "don't")
            aligned.append({
                "position": si,
                "text": story_tokens[si],
                "start": whisper_words[wi]["start"],
                "end": whisper_words[wi]["end"],
            })
            si += 1
            wi += 1
        else:
            # Mismatch. Try skipping one whisper word (Whisper may have inserted/merged)
            # Check if next whisper word matches current story word
            if wi + 1 < len(whisper_clean) and whisper_clean[wi + 1] == s_word:
                wi += 1  # Skip this whisper word
            elif si + 1 < len(story_clean) and story_clean[si + 1] == w_word:
                si += 1  # Skip this story token
            else:
                # Just advance both and log the mismatch
                if si < 5 or si % 100 == 0:
                    print(f"  Mismatch at position {si}: story='{s_word}' vs whisper='{w_word}'")
                si += 1
                wi += 1
    
    # Handle remaining story tokens (assign last whisper timestamp)
    if wi > 0 and si < len(story_clean):
        last_end = whisper_words[wi - 1]["end"]
        while si < len(story_clean):
            aligned.append({
                "position": si,
                "text": story_tokens[si],
                "start": last_end,
                "end": last_end,
            })
            si += 1
    
    print(f"\nAligned {len(aligned)} / {len(story_tokens)} story tokens")
    matched = sum(1 for a in aligned if a["end"] > a["start"] or a["end"] > 0)
    print(f"Matched with real timestamps: {matched}")
    
    # Save aligned timestamps
    aligned_path = Path(__file__).parent / "word-timestamps-aligned.json"
    with open(aligned_path, "w") as f:
        json.dump(aligned, f, indent=2)
    print(f"Aligned timestamps saved to: {aligned_path}")
    
    # Show some stats
    if aligned:
        durations = [a["end"] - a["start"] for a in aligned if a["end"] > a["start"]]
        if durations:
            print(f"\nAvg word duration: {sum(durations)/len(durations):.3f}s")
            print(f"Min: {min(durations):.3f}s, Max: {max(durations):.3f}s")
        
        # Find gaps (words with no real timestamp)
        zero_duration = sum(1 for a in aligned if a["end"] <= a["start"])
        print(f"Zero-duration words (unmatched): {zero_duration}")

if __name__ == "__main__":
    main()
