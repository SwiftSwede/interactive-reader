#!/usr/bin/env python3
"""Verify that the FILLED audio actually contains what the segments claim.

The drift guard: after every audio rebuild, transcribe the filled file and
diff every english/narration segment's words against what the audio really
says at that position. Catches coordinate drift (segments pointing at audio
that moved) and missing splices.

Usage:
  verify_filled.py <day> [--filled <path>] [--model small] [--window 4.0]

Requires: day{N}-whisper-filled.json (transcribe the filled file first):
  whisper public/audio/iplo/day-N-filled.m4a --model small --word_timestamps True \\
    --output_format json --output_dir /tmp   # rename to day{N}-whisper-filled.json

Exit code 0 = clean, 1 = mismatches found.
"""
import json, os, sys, unicodedata

IPLO = os.path.dirname(os.path.abspath(__file__))

def fold(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower()

def toks(text):
    return [fold(t) for t in text.split() if fold(t)]

def main():
    day = int(sys.argv[1])
    filled = os.path.join(IPLO, f"day{day}-segments.json")
    wav = None
    model = "small"
    window = 4.0
    for i, arg in enumerate(sys.argv):
        if arg == "--filled": wav = sys.argv[i + 1]
        if arg == "--model": model = sys.argv[i + 1]
        if arg == "--window": window = float(sys.argv[i + 1])
    if not wav:
        wav = f"public/audio/iplo/day-{day}-filled.m4a"

    filled_json = f"/tmp/day{day}-whisper-filled.json"
    if not os.path.exists(filled_json):
        print(f"ERROR: {filled_json} not found. Transcribe the filled file first:\n"
              f"  whisper {wav} --model {model} --word_timestamps True --output_format json --output_dir /tmp\n"
              f"  mv /tmp/{os.path.basename(wav).split('.')[0]}.json {filled_json}")
        sys.exit(2)

    segs = json.load(open(filled, encoding="utf-8"))["segments"]
    wj = json.load(open(filled_json, encoding="utf-8"))
    fwords = [(w["word"].strip(), w["start"], w["end"])
              for seg in wj["segments"] for w in seg.get("words", []) if w["word"].strip()]
    print(f"{len(segs)} segments | {len(fwords)} filled-audio words")

    mismatches = []
    for s in segs:
        if s.get("t") not in ("english", "narration"):
            continue
        expected = toks(s.get("text", ""))
        if not expected:
            continue
        st, en = s["start"], s["end"]
        # audio words within [st - 0.5, en + 1.5] tolerance window
        heard = [w for w in fwords if st - 0.5 <= w[1] <= en + 1.5]
        heard_txt = " ".join(w[0] for w in heard)
        heard_toks = toks(heard_txt)
        if not heard_toks:
            mismatches.append((s, "EMPTY", expected, ""))
            continue
        # fraction of expected tokens present anywhere in the tolerance window
        present = sum(1 for t in expected if any(h.startswith(t[:4]) or t.startswith(h[:4]) for h in heard_toks))
        frac = present / len(expected)
        if frac < 0.5:
            mismatches.append((s, f"{present}/{len(expected)}", expected, heard_txt))

    if mismatches:
        print(f"\n{len(mismatches)} MISMATCHES:")
        for s, ratio, exp, heard in mismatches:
            print(f"  @{s['start']:.1f}s [{s.get('t')}] expected {' '.join(exp)[:60]!r}")
            print(f"      matched {ratio} | heard: {heard[:80]!r}")
        sys.exit(1)
    print("\nAll english/narration segments verified against filled audio. Clean.")

if __name__ == "__main__":
    main()
