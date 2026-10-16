#!/usr/bin/env python3
"""Compare a day's segment clock to Whisper and to the lesson audio file.

Original Whisper has no filled (spliced) lines. A lag vs that transcript at
the insert is the fill, not a phantom. If day-N-filled.m4a exists, do not
delete those lines. Convert AAC from the filled MP3.

    python3 scripts/iplo/check_clock.py --day 1
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAG_FLOOR = 1.2


def fold(value: str) -> str:
    stripped = unicodedata.normalize("NFD", value)
    stripped = "".join(ch for ch in stripped if not unicodedata.combining(ch))
    return re.sub(r"[^a-z]", "", stripped.lower())


def load_whisper(path: Path) -> list[tuple[str, float]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    words: list[tuple[str, float]] = []
    for segment in payload["segments"]:
        for word in segment.get("words") or []:
            token = fold(str(word.get("word") or ""))
            if len(token) < 4:
                continue
            words.append((token, float(word["start"])))
    return words


def distinctive(segment: dict) -> list[str]:
    text = str(segment.get("text") or segment.get("spanish") or "")
    tokens = [
        fold(part)
        for part in re.findall(r"[A-Za-zÁÉÍÓÚáéíóúÑñ'\u2018\u2019]+", text)
    ]
    return [token for token in tokens if len(token) >= 4][:2]


def sequence_lag(
    tokens: list[str], start: float, whisper: list[tuple[str, float]]
) -> float | None:
    best: float | None = None
    for index, (word, at) in enumerate(whisper):
        if word != tokens[0] or abs(at - start) > 8:
            continue
        cursor = index
        ok = True
        for token in tokens:
            hit = None
            for look in range(cursor, min(len(whisper), cursor + 6)):
                if whisper[look][0] == token:
                    hit = look
                    break
            if hit is None:
                ok = False
                break
            cursor = hit + 1
        if not ok:
            continue
        delta = at - start
        if best is None or abs(delta) < abs(best):
            best = delta
    return best


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--day", type=int, required=True)
    args = parser.parse_args()
    folder = ROOT / "scripts" / "iplo"
    segments_path = folder / f"day{args.day}-segments.json"
    whisper_path = folder / f"day{args.day}-whisper.json"
    if not segments_path.exists() or not whisper_path.exists():
        print(f"Missing {segments_path.name} or {whisper_path.name}")
        return 1

    segments = json.loads(segments_path.read_text(encoding="utf-8"))["segments"]
    whisper = load_whisper(whisper_path)
    misses: list[str] = []
    lags: list[tuple[float, float]] = []

    for segment in segments:
        kind = segment.get("t")
        if kind not in {"english", "narration"}:
            continue
        start = float(segment["start"])
        tokens = distinctive(segment)
        if len(tokens) < 2:
            continue
        lag = sequence_lag(tokens, start, whisper)
        if lag is None:
            misses.append(f"{kind} {start:.1f} missing {' '.join(tokens)}")
            continue
        if abs(lag) > LAG_FLOOR:
            lags.append((start, lag))
            misses.append(f"{kind} {start:.1f} lag {lag:+.2f}s {' '.join(tokens)}")

    print(f"day {args.day}: {len(misses)} off lines")
    for row in misses[:20]:
        print(row)
    if len(misses) > 20:
        print(f"... {len(misses) - 20} more")

    filled = ROOT / "public" / "audio" / "iplo" / f"day-{args.day}-filled.m4a"
    lesson_end = max(float(seg.get("end") or seg.get("start") or 0) for seg in segments)
    if filled.exists():
        probe = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=nw=1:nk=1",
                str(filled),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        duration = float(probe.stdout.strip()) if probe.returncode == 0 and probe.stdout.strip() else None
        print(f"filled m4a present, script end {lesson_end:.1f}s, file {duration:.1f}s" if duration else "filled m4a present")
        if duration is not None and abs(duration - lesson_end) > 2:
            print("duration mismatch: convert AAC from day-N-filled.mp3, do not drop the fill")
            return 2
        later = [lag for start, lag in lags if start > 60]
        if later:
            first = min(start for start, _ in lags if start > 60)
            print(
                f"lags vs original Whisper after {first:.1f}s are the fill. "
                "Do not delete those lines."
            )
        return 0

    later = [lag for start, lag in lags if start > 60]
    if later:
        mean = sum(later) / len(later)
        if abs(mean) > LAG_FLOOR:
            first = min(start for start, _ in lags if start > 60)
            print(
                f"clock slip after {first:.1f}s, later lines average {mean:+.2f}s. "
                "If Kyle asked for a fill, splice audio; do not convert the original recording."
            )
            return 2
    if misses:
        return 2
    print("clock matches the transcript")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
