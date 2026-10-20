#!/usr/bin/env python3
"""Drift guard: verify the FILLED audio matches what the segments claim.

Three checks after every audio rebuild:

1. DONOR RECONCILIATION (hard fail): every fill entry that carries a
   donorText must have an english segment sitting at the donor's filled
   position whose text matches. Day 3 shipped donor splices whose segments
   stayed at the old position, so the text appeared one donor-length late
   (Kyle QA 2026-10-19: 3:07, 5:18).
2. POCKET SILENCE (hard fail): every fill entry without donorText must be
   actual silence in the filled audio. One pocket was accidentally built
   from the file's first second and leaked a 1s intro-music fragment
   (Kyle QA 2026-10-19: 3:48). Whisper cannot hear music, so this is an
   RMS check, not a transcript check.
3. TRANSCRIPT DIFF (report): diff every english/narration segment's words
   against the filled-file transcript, using local sequence search (not
   fixed windows - whisper's own timestamps drift by seconds over long
   files). OK / DRIFT / MISSING are reported for human judgment because
   small-model dropouts on quiet choral repeats look like MISSINGS.

Fill entries: {"at": <unfilled position>, "shift": <seconds inserted,
negative = removal>, "donorText": "<what the donor says>" (donor fills
only; pure silence pockets omit it)}.

Usage:
  verify_filled.py <day> [--audio <filled.m4a>] [--radius 25] [--max-drift 1.5]

Requires the filled-file transcript at /tmp/day{N}-whisper-filled.json:
  whisper public/audio/iplo/day-N-filled.m4a --model small --word_timestamps True \\
    --output_format json --output_dir /tmp   # then rename to day{N}-whisper-filled.json

Exit 0 = hard checks pass; 1 = donor or pocket failure; 2 = missing transcript.
"""
import json, math, os, subprocess, sys, unicodedata

IPLO = os.path.dirname(os.path.abspath(__file__))

def fold(s):
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if not unicodedata.combining(c)).lower()

def toks(text):
    text = text.replace("'", "").replace("’", "")
    return [fold(t) for t in text.split() if fold(t)]

def filled_positions(fills):
    """Yield (index, filled_start, filled_end, fill) for each fill entry."""
    cum = 0.0
    out = []
    for i, f in enumerate(fills):
        at, shift = f["at"], f["shift"]
        start = at + cum
        cum += shift
        out.append((i, start, start + shift, f))
    return out

def rms_profile(audio_path, sr=8000):
    """Decode to mono PCM and return per-50ms RMS levels in dB."""
    raw = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", audio_path, "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"],
        capture_output=True).stdout
    import array
    samples = array.array("h"); samples.frombytes(raw)
    win = sr // 20  # 50 ms
    levels = []
    for i in range(0, len(samples) - win, win):
        chunk = samples[i:i + win]
        rms = (sum(float(x) * x for x in chunk) / win) ** 0.5
        levels.append(20 * math.log10(max(rms / 32768.0, 1e-9)))
    return levels, sr / win

def main():
    day = int(sys.argv[1])
    seg_path = os.path.join(IPLO, f"day{day}-segments.json")
    audio = f"public/audio/iplo/day-{day}-filled.m4a"
    radius, max_drift = 25.0, 1.5
    for i, arg in enumerate(sys.argv):
        if arg == "--audio": audio = sys.argv[i + 1]
        if arg == "--radius": radius = float(sys.argv[i + 1])
        if arg == "--max-drift": max_drift = float(sys.argv[i + 1])

    filled_json = f"/tmp/day{day}-whisper-filled.json"
    if not os.path.exists(filled_json):
        print(f"ERROR: {filled_json} not found. Transcribe the filled file first:\n"
              f"  whisper {audio} --model small --word_timestamps True --output_format json --output_dir /tmp")
        sys.exit(2)

    data = json.load(open(seg_path, encoding="utf-8"))
    segs = data["segments"]
    fills = data.get("fill", [])
    wj = json.load(open(filled_json, encoding="utf-8"))
    fwords = [(fold(w["word"].strip().replace("'", "").replace("’", "")), w["start"], w["end"])
              for seg in wj["segments"] for w in seg.get("words", []) if w["word"].strip()]
    ftexts = [w[0] for w in fwords]
    print(f"{len(segs)} segments | {len(fills)} fills | {len(fwords)} filled-audio words")

    failures = []

    # --- check 1: donor reconciliation -------------------------------------
    print("\n== Donor reconciliation ==")
    for i, fstart, fend, f in filled_positions(fills):
        dt = f.get("donorText")
        if not dt:
            continue
        want = toks(dt)
        cand = [s for s in segs if s.get("t") == "english"
                and abs(s["start"] - fstart) <= 0.75
                and toks(s.get("text", "")) == want]
        if cand:
            s = cand[0]
            print(f"  OK  fill@{f['at']:.2f} -> donor {fstart:.2f}-{fend:.2f} = segment {s['start']:.2f}-{s['end']:.2f} {dt!r}")
        else:
            near = [s for s in segs if s.get("t") == "english" and fstart - 3 <= s["start"] <= fend + 6
                    and toks(s.get("text", "")) == want]
            if near:
                s = near[0]
                print(f"  FAIL fill@{f['at']:.2f} -> donor plays {fstart:.2f}-{fend:.2f} but its segment sits at "
                      f"{s['start']:.2f} ({s['start'] - fstart:+.2f}s off): {dt!r}")
            else:
                print(f"  FAIL fill@{f['at']:.2f} -> donor {fstart:.2f}-{fend:.2f} has NO matching segment "
                      f"(expected {dt!r})")
            failures.append(f"donor@{f['at']:.2f}")

    # --- check 2: pocket silence -------------------------------------------
    print("\n== Pocket silence (RMS) ==")
    levels, rate = rms_profile(audio)
    for i, fstart, fend, f in filled_positions(fills):
        if f.get("donorText") or f.get("insert") or f.get("cut") or f["shift"] <= 0:
            continue  # donor inserts and removals carry audio by design
        a, b = int(fstart * rate), int(fend * rate)
        window = levels[max(a, 0):min(b, len(levels))]
        if not window:
            continue
        peak = max(window)
        if peak > -45:
            print(f"  FAIL pocket@{f['at']:.2f} ({fstart:.2f}-{fend:.2f}s) peak {peak:.1f} dB - AUDIO IN POCKET")
            failures.append(f"pocket@{f['at']:.2f}")
        else:
            print(f"  OK  pocket@{f['at']:.2f} ({fstart:.2f}-{fend:.2f}s) peak {peak:.1f} dB")

    # --- check 3: transcript diff (report only) ----------------------------
    print("\n== Transcript diff (report; whisper dropouts can fake MISSINGS) ==")
    results = []
    for s in segs:
        if s.get("t") not in ("english", "narration"):
            continue
        expected = toks(s.get("text", ""))
        if not expected:
            continue
        n = len(expected)
        st = s["start"]
        best = (0.0, None)
        i = 0
        while i < len(fwords) and fwords[i][1] < st - radius:
            i += 1
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
    print(f"OK: {ok} | DRIFT: {len(drift)} | MISSING: {len(missing)}")
    for s, tag, score, off, heard in drift:
        print(f"  DRIFT @{s['start']:.1f}s -> audio at {s['start']+off:.1f}s ({off:+.1f}s) score {score:.0%}")
        print(f"      expected: {s.get('text','')[:70]!r}")
        print(f"      heard:    {heard!r}")
    for s, tag, score, off, exp in missing:
        print(f"  MISSING @{s['start']:.1f}s score {score:.0%}")
        print(f"      expected: {exp!r}")

    if failures:
        print(f"\n{len(failures)} HARD FAILURE(S): {', '.join(failures)}")
        sys.exit(1)
    print("\nHard checks clean (donor reconciliation + pocket silence).")
    sys.exit(0)

if __name__ == "__main__":
    main()
