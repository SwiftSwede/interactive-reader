#!/usr/bin/env python3
"""Verify that the FILLED audio actually contains what the segments claim.

The drift guard: after every audio rebuild, transcribe the filled file and
diff every english/narration segment's words against what the audio really
says. Uses local sequence search (not fixed windows) because whisper's own
word timestamps drift by seconds over long files: for each segment it finds
the best-matching heard-token window near the expected position and reports
OK (in place), DRIFT (found but offset), or MISSING (not found at all).

Usage:
  verify_filled.py <day> [--filled <segments.json>] [--radius 20] [--max-drift 1.0]

Requires the filled-file transcript at /tmp/day{N}-whisper-filled.json:
  whisper public/audio/iplo/day-N-filled.m4a --model small --word_timestamps True \\
    --output_format json --output_dir /tmp   # then rename to day{N}-whisper-filled.json

Exit code 0 = no MISSING and no drift > --max-drift, 1 otherwise.
"""
import json, os, sys, unicodedata

IPLO = os.path.dirname(os.path.abspath(__file__))

def fold(s):
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if not unicodedata.combining(c)).lower()

def toks(text):
    text = text.replace("'", "")
    return [fold(t) for t in text.split() if fold(t)]

def main():
    day = int(sys.argv[1])
    seg_path = os.path.join(IPLO, f"day{day}-segments.json")
    radius, max_drift = 20.0, 1.0
    for i, arg in enumerate(sys.argv):
        if arg == "--filled": seg_path = sys.argv[i + 1]
        if arg == "--radius": radius = float(sys.argv[i + 1])
        if arg == "--max-drift": max_drift = float(sys.argv[i + 1])

    filled_json = f"/tmp/day{day}-whisper-filled.json"
    if not os.path.exists(filled_json):
        print(f"ERROR: {filled_json} not found. Transcribe the filled file first:\n"
              f"  whisper public/audio/iplo/day-{day}-filled.m4a --model small --word_timestamps True --output_format json --output_dir /tmp")
        sys.exit(2)

    segs = json.load(open(seg_path, encoding="utf-8"))["segments"]
    wj = json.load(open(filled_json, encoding="utf-8"))
    fwords = [(fold(w["word"].strip().replace("'", "")), w["start"], w["end"])
              for seg in wj["segments"] for w in seg.get("words", []) if w["word"].strip()]
    ftexts = [w[0] for w in fwords]
    print(f"{len(segs)} segments | {len(fwords)} filled-audio words")

    results = []
    for s in segs:
        if s.get("t") not in ("english", "narration"):
            continue
        expected = toks(s.get("text", ""))
        if not expected:
            continue
        n = len(expected)
        st = s["start"]
        best = (0.0, None)  # (score, start_index)
        i = 0
        while i < len(fwords) and fwords[i][1] < st - radius:
            i += 1
        start_i = i
        while i < len(fwords) and fwords[i][1] <= st + radius:
            win = ftexts[i:i + n]
            if len(win) == n:
                score = sum(1 for a, b in zip(expected, win)
                            if len(a) > 2 and len(b) > 2 and (a.startswith(b[:4]) or b.startswith(a[:4]))) / n
                if score > best[0]:
                    best = (score, i)
            i += 1
        score, idx = best
        if score < 0.5:
            results.append((s, "MISSING", score, None, " ".join(expected)[:70]))
        else:
            offset = fwords[idx][1] - st
            tag = "OK" if abs(offset) <= max_drift else "DRIFT"
            results.append((s, tag, score, offset, " ".join(ftexts[idx:idx + n])[:70]))

    ok = sum(1 for r in results if r[1] == "OK")
    drift = [r for r in results if r[1] == "DRIFT"]
    missing = [r for r in results if r[1] == "MISSING"]
    print(f"\nOK: {ok} | DRIFT: {len(drift)} | MISSING: {len(missing)}")
    for s, tag, score, off, heard in drift:
        print(f"  DRIFT @{s['start']:.1f}s -> audio at {s['start']+off:.1f}s ({off:+.1f}s) score {score:.0%}")
        print(f"      expected: {s.get('text','')[:70]!r}")
        print(f"      heard:    {heard!r}")
    for s, tag, score, off, exp in missing:
        print(f"  MISSING @{s['start']:.1f}s score {score:.0%}")
        print(f"      expected: {exp!r}")
    sys.exit(1 if (drift or missing) else 0)

if __name__ == "__main__":
    main()
