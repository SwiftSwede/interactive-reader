#!/usr/bin/env python3
"""
Align Whisper word timestamps to story word positions using
a windowed matching approach that handles insertions, deletions,
and substitutions without losing sync.

Run: python3.11 scripts/align-timestamps.py
"""

import json
import re
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

# ── Config ─────────────────────────────────────────────────

WHISPER_PATH = Path(__file__).parent / "word-timestamps.json"
OUTPUT_PATH = Path(__file__).parent / "word-timestamps-aligned.json"

# ── Helpers ────────────────────────────────────────────────

def clean(text: str) -> str:
    """Normalize for matching: lowercase, strip punctuation, normalize quotes."""
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = re.sub(r"[^a-zA-Z0-9'\-]", "", text).lower().strip()
    return text

# ── Windowed alignment ─────────────────────────────────────

def align(story_tokens, whisper_words, window=15):
    """
    For each story token, find the next matching whisper word
    within a window of `window` positions. This handles insertions
    (extra whisper words), deletions (missing whisper words),
    and substitutions (wrong word) without losing sync.
    """
    s_clean = [clean(t) for t in story_tokens]
    w_clean = [clean(w["text"]) for w in whisper_words]
    
    aligned = []
    wi = 0  # whisper index, monotonically increasing
    
    for si in range(len(s_clean)):
        s_word = s_clean[si]
        found = -1
        
        # Search forward from current wi position
        search_start = wi
        search_end = min(wi + window, len(w_clean))
        
        for j in range(search_start, search_end):
            w_word = w_clean[j]
            
            # Exact match
            if s_word == w_word:
                found = j
                break
            
            # Handle empty tokens
            if not s_word or not w_word:
                continue
            
            # Fuzzy match: one is a substring of the other
            # (handles "real" vs "reall", "dont" vs "don't")
            if len(s_word) > 2 and len(w_word) > 2:
                if s_word in w_word or w_word in s_word:
                    # But only if they share the first 3 chars
                    if s_word[:3] == w_word[:3]:
                        found = j
                        break
            
            # Levenshtein distance of 1 (single char difference)
            if len(s_word) > 3 and len(w_word) > 3:
                if abs(len(s_word) - len(w_word)) <= 1:
                    diffs = sum(1 for a, b in zip(s_word, w_word) if a != b)
                    max_len = max(len(s_word), len(w_word))
                    if diffs <= 1 and (max_len - min(len(s_word), len(w_word))) <= 1:
                        found = j
                        break
        
        if found >= 0:
            aligned.append({
                "position": si,
                "text": story_tokens[si],
                "start": round(whisper_words[found]["start"], 3),
                "end": round(whisper_words[found]["end"], 3),
            })
            wi = found + 1  # Move whisper pointer past this match
        else:
            # No match found. Assign the timestamp of the nearest whisper word
            # so we don't leave gaps (the word will flash briefly)
            if wi < len(whisper_words):
                t = whisper_words[wi]["start"]
            elif wi > 0:
                t = whisper_words[wi - 1]["end"]
            else:
                t = 0.0
            aligned.append({
                "position": si,
                "text": story_tokens[si],
                "start": round(t, 3),
                "end": round(t, 3),
            })
            # Don't advance wi — the whisper word might match a future story token
    
    return aligned

# ── Main ───────────────────────────────────────────────────

def main():
    # Load whisper timestamps
    with open(WHISPER_PATH) as f:
        whisper_words = json.load(f)
    
    print(f"Whisper words: {len(whisper_words)}")
    
    # Load story from Supabase
    supabase = create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    )
    story = supabase.table("stories").select("body_text").eq("is_free", True).execute()
    if not story.data:
        print("ERROR: No free story found")
        sys.exit(1)
    
    body_text = story.data[0]["body_text"]
    story_tokens = [t for t in body_text.split() if t.strip()]
    print(f"Story tokens: {len(story_tokens)}")
    
    # Align
    print("Aligning...")
    aligned = align(story_tokens, whisper_words, window=15)
    
    # Stats
    matched = sum(1 for a in aligned if a["end"] > a["start"])
    unmatched = len(aligned) - matched
    print(f"Matched with real timestamps: {matched}/{len(aligned)}")
    print(f"Unmatched (zero-duration): {unmatched}")
    
    # Show unmatched words
    if unmatched > 0:
        print("\nUnmatched words:")
        for a in aligned:
            if a["end"] <= a["start"]:
                print(f"  position {a['position']}: '{a['text']}'")
    
    # Show alignment around first few mismatches for verification
    print("\nFirst 15 aligned:")
    for a in aligned[:15]:
        dur = a["end"] - a["start"]
        status = "OK" if dur > 0 else "UNMATCHED"
        print(f"  {a['position']:4d}: {a['start']:7.2f}-{a['end']:7.2f}s  '{a['text']}'  {status}")
    
    # Save
    with open(OUTPUT_PATH, "w") as f:
        json.dump(aligned, f, indent=2)
    print(f"\nSaved to: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
