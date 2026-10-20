#!/usr/bin/env python3
"""Build day-N-filled.m4a from the ORIGINAL recording + the fill cut list.

This is the only sanctioned way to produce a filled file. Incremental
splicing of an already-filled file caused the wrong-timeline donor bug
(round 7b) and two corrupted silence pockets (2026-10-19: one pocket
contained a copy of the intro music, another duplicated 0.8s of the
original instead of inserting silence). The fills list in
day{N}-segments.json is the single source of truth; this script executes
it against the untouched day-N.mp3.

Fill entry fields:
  at       unfilled (original-recording) position where the edit happens
  shift    net seconds added (+) or removed (-); insert minus cut
  insert   optional [[source, start, end], ...] slices played at the cut
           point; source "self" = day-N.mp3, "maggie{N}" = Maggie Ross
           day-N WAV. Absent = generated silence (anullsrc semantics).
  cut      optional [[source, start, end], ...] ranges of the original to
           SKIP (removals); must start at `at` for the first range and sum
           to the removed time.
  donorText optional (for verify_filled.py reconciliation only)
  donor    optional human-readable provenance note

Invariant: sum(insert lengths) - sum(cut lengths) == shift (|tolerance| 0.02).
Fills must be sorted by `at`.

Run from the repo root:  python3 scripts/iplo/build_filled.py <day>
Writes day-N-filled.m4a (AAC 128k, moov-first).
"""
import json, os, subprocess, sys

IPLO = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(IPLO))
SR = 44100

def decode(path, ss=0.0, to=None):
    cmd = ["ffmpeg", "-loglevel", "error", "-ss", str(ss)]
    if to is not None:
        cmd += ["-t", str(round(to - ss, 6))]
    cmd += ["-i", path, "-ac", "2", "-ar", str(SR), "-f", "s16le", "-"]
    return subprocess.run(cmd, capture_output=True).stdout

def main():
    day = int(sys.argv[1])
    seg_path = os.path.join(IPLO, f"day{day}-segments.json")
    data = json.load(open(seg_path, encoding="utf-8"))
    fills = data.get("fill", [])
    orig = os.path.join(REPO, f"public/audio/iplo/day-{day}.mp3")
    out_tmp = f"/tmp/day-{day}-filled-build.raw"
    out = os.path.join(REPO, f"public/audio/iplo/day-{day}-filled.m4a")
    maggie_dir = ("/Volumes/Kyle's Passport/English/inglesPorLosOidos/"
                  "EnglishLikeCrazy_FemaleParts_MaggieRoss_eLearning")
    sources = {"self": orig}
    mw = os.path.join(maggie_dir, f"Day{day}_EnglishLikeCrazy_FemaleParts_MaggieRoss_eLearning.wav")
    if os.path.exists(mw):
        sources[f"maggie{day}"] = mw

    parts = []
    head = 0.0  # read position in the original
    for f in sorted(fills, key=lambda x: x["at"]):
        at, shift = f["at"], f["shift"]
        if at < head - 0.01:
            print(f"ERROR: fill at {at} is before the read head {head:.2f}.")
            sys.exit(2)
        insert = f.get("insert") or []
        cut = f.get("cut") or []
        ins_len = sum(b - a for _, a, b in insert)
        cut_len = sum(b - a for _, a, b in cut)
        if insert or cut:
            if abs((ins_len - cut_len) - shift) > 0.02:
                print(f"ERROR: fill@{at} insert({ins_len:.3f}) - cut({cut_len:.3f}) != shift({shift:.3f})")
                sys.exit(2)
        elif shift < 0:
            print(f"ERROR: fill@{at} negative shift but no cut ranges given")
            sys.exit(2)
        # original audio up to the cut point
        parts.append(decode(orig, head, at))
        head = at
        # skip cut ranges (must start at the read head)
        for _, a, b in sorted(cut, key=lambda x: x[1]):
            if abs(a - head) > 0.02:
                print(f"ERROR: fill@{at} cut range [{a},{b}] does not start at read head {head:.2f}")
                sys.exit(2)
            head = b
        # inserts: donor slices or generated silence
        if insert:
            for name, a, b in insert:
                if name not in sources:
                    print(f"ERROR: unknown donor source {name!r} (available: {list(sources)})")
                    sys.exit(2)
                parts.append(decode(sources[name], a, b))
        else:
            parts.append(b"\x00" * (int(round(shift * SR)) * 4))
    parts.append(decode(orig, head))  # tail

    with open(out_tmp, "wb") as fh:
        for p in parts:
            fh.write(p)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR),
                    "-ac", "2", "-i", out_tmp, "-c:a", "aac", "-b:a", "128k",
                    "-movflags", "+faststart", out], check=True)
    os.remove(out_tmp)
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", out], capture_output=True, text=True).stdout.strip()
    print(f"built {out} duration={dur}")

if __name__ == "__main__":
    main()
