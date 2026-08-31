#!/usr/bin/env python3
"""Generate word-level timestamps for a story audio file using Whisper.

Outputs a JSON file matching the format expected by InteractiveStory:
[
  { "position": 0, "text": "Christie", "start": 0.0, "end": 0.74 },
  { "position": 1, "text": "got", "start": 0.74, "end": 1.0 },
  ...
]

Usage:
  python3.11 scripts/generate-timestamps.py --audio public/audio/stories/flustered-and-driving.mp3 --story-id <uuid> --slug flustered-and-driving

The --story-id is used to fetch the word order from Supabase so positions
match the database. If --story-id is omitted, positions are assigned by
word order in the transcript (0-indexed).
"""

import argparse
import json
import os
import re
import sys

def parse_args():
    parser = argparse.ArgumentParser(description="Generate word timestamps with Whisper")
    parser.add_argument("--audio", required=True, help="Path to the MP3 file")
    parser.add_argument("--slug", required=True, help="Story slug (for output filename)")
    parser.add_argument("--model", default="turbo", help="Whisper model (tiny/base/small/medium/large/turbo)")
    parser.add_argument("--output-dir", default="public/audio/stories", help="Output directory")
    return parser.parse_args()

def main():
    args = parse_args()
    
    if not os.path.exists(args.audio):
        print(f"Error: Audio file not found: {args.audio}")
        sys.exit(1)
    
    print(f"Loading Whisper model '{args.model}'...")
    import whisper
    model = whisper.load_model(args.model)
    
    print(f"Transcribing {args.audio}...")
    result = model.transcribe(args.audio, word_timestamps=True, language="en")
    
    # Extract word-level timestamps
    words = []
    for segment in result.get("segments", []):
        for word_info in segment.get("words", []):
            text = word_info["word"].strip()
            if not text:
                continue
            words.append({
                "text": text,
                "start": round(word_info["start"], 2),
                "end": round(word_info["end"], 2),
            })
    
    if not words:
        print("Error: No word timestamps found in Whisper output")
        sys.exit(1)
    
    print(f"Whisper found {len(words)} words")
    
    # Assign positions (0-indexed)
    for i, w in enumerate(words):
        w["position"] = i
    
    # Reorder keys: position, text, start, end
    output = []
    for w in words:
        output.append({
            "position": w["position"],
            "text": w["text"],
            "start": w["start"],
            "end": w["end"],
        })
    
    # Write output
    output_path = os.path.join(args.output_dir, f"{args.slug}-timestamps.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"\nWrote {len(output)} word timestamps to {output_path}")
    print(f"\nFirst 10 words:")
    for w in output[:10]:
        print(f"  {w['position']}: {w['text']} ({w['start']:.2f}-{w['end']:.2f})")
    print(f"\nLast 5 words:")
    for w in output[-5:]:
        print(f"  {w['position']}: {w['text']} ({w['start']:.2f}-{w['end']:.2f})")

if __name__ == "__main__":
    main()
