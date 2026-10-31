#!/usr/bin/env python3
"""Iplo day verification gate: one command for everything scriptable.

Usage: python3 iplo_verify.py <day> [--base http://localhost:3004]

Checks (each PASS/FAIL):
  1. lint_segments.py <day> exits clean (0 findings)
  2. day<N>-segments.json sorted by start; no non-prompt overlaps
  3. day-<N>.m4a exists and its duration matches the header durationSeconds
  4. DB round-trip (via verify_db.ts): story row, kind, header, segment
     count matches the JSON, course_lessons position
  5. /lesson/iplo-day-<N> serves 200; audio range-requests with 206

Exit 0 = all pass. Browser prompt-cycle check is interactive: see
cycle_check.js in this directory (run it in the browser harness over
/dev/iplo-repro?day=<N> with Page.bringToFront active).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IPLO = Path(__file__).resolve().parent
RESULTS: list[tuple[bool, str]] = []


def check(ok: bool, label: str, detail: str = "") -> bool:
    RESULTS.append((ok, label + (f" | {detail}" if detail else "")))
    return ok


def main() -> int:
    day = None
    base = "http://localhost:3004"
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == "--base":
            base = args[i + 1]
        elif a.isdigit():
            day = int(a)
    if day is None:
        print(__doc__)
        return 2

    seg_path = IPLO / f"day{day}-segments.json"
    if not check(seg_path.exists(), "segments file", str(seg_path.name)):
        return 1
    segs = json.load(open(seg_path))["segments"]

    # 1. lint
    r = subprocess.run(
        [sys.executable, str(IPLO / "lint_segments.py"), str(day)],
        capture_output=True, text=True, cwd=ROOT,
    )
    m = re.search(r"(\d+) findings", r.stdout)
    findings = int(m.group(1)) if m else -1
    check(findings == 0, "lint", f"{findings} findings")

    # 2. sorted + overlaps
    sorted_ok = all(
        segs[i]["start"] <= segs[i + 1]["start"] for i in range(len(segs) - 1)
    )
    check(sorted_ok, "segments sorted by start")
    overlaps = [
        f"{a['t']}@{a['start']:.1f} -> {b['t']}@{b['start']:.1f}"
        for a, b in zip(segs, segs[1:])
        if b["start"] < a["end"] and a["t"] != "prompt" and b["t"] != "prompt"
    ]
    check(not overlaps, "no non-prompt overlaps", "; ".join(overlaps[:3]))

    # 3. audio duration vs header
    audio = ROOT / "public" / "audio" / "iplo" / f"day-{day}.m4a"
    filled = ROOT / "public" / "audio" / "iplo" / f"day-{day}-filled.m4a"
    target = filled if filled.exists() else audio
    if check(target.exists(), "audio file", target.name):
        r = subprocess.run(
            ["afinfo", str(target)], capture_output=True, text=True
        )
        m = re.search(r"estimated duration: ([\d.]+)", r.stdout)
        audio_dur = float(m.group(1)) if m else 0.0
        last_end = max(s["end"] for s in segs)
        check(
            abs(audio_dur - last_end) < 2.0,
            "audio duration vs last segment end",
            f"audio {audio_dur:.1f}s vs segments {last_end:.1f}s",
        )

    # 4. DB round-trip
    url = ""
    r = subprocess.run(
        ["npx", "tsx", "scripts/iplo/verify_db.ts", str(day)],
        capture_output=True, text=True, cwd=ROOT,
    )
    try:
        db = json.loads(r.stdout.strip().splitlines()[-1])
    except Exception:
        db = {"ok": False, "reason": r.stdout[-200:] + r.stderr[-200:]}
    if check(db.get("ok") is True, "DB story row", db.get("reason", "")):
        header = db["header"]
        check(db["kind"] == "audio_course", "DB kind", str(db["kind"]))
        url = (header.get("audioUrl") or "").lstrip("/")
        check(
            url.endswith(f"day-{day}.m4a") or url.endswith(f"day-{day}-filled.m4a"),
            "DB audioUrl", str(url),
        )
        check(
            db["segmentCount"] == len(segs),
            "DB segment count matches JSON",
            f"db {db['segmentCount']} vs json {len(segs)}",
        )
        pos = [l.get("position") for l in db.get("courseLessons", [])]
        check(bool(pos), "course_lessons position", str(pos))

    # 5. HTTP
    r = subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
         f"{base}/lesson/iplo-day-{day}"],
        capture_output=True, text=True,
    )
    check(r.stdout.strip() == "200", "lesson route 200", r.stdout.strip())
    if url:
        r = subprocess.run(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-H",
             "Range: bytes=0-1023", f"{base}/{url}"],
            capture_output=True, text=True,
        )
        check(r.stdout.strip() == "206", "audio range 206", r.stdout.strip())

    width = max(len(lbl) for _, lbl in RESULTS)
    for ok, lbl in RESULTS:
        print(f"{'PASS' if ok else 'FAIL'}  {lbl}")
    failed = sum(1 for ok, _ in RESULTS if not ok)
    print(f"\n{len(RESULTS) - failed}/{len(RESULTS)} checks passed")
    print("Interactive step remaining: prompt-cycle check via cycle_check.js")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())