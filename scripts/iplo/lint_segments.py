#!/usr/bin/env python3
"""Pre-import QA lint for Iplo day segments.

Run BEFORE `iplo-import.ts --only N` and BEFORE Kyle playtests:
  python3 scripts/iplo/lint_segments.py 3
  python3 scripts/iplo/lint_segments.py 1 2   (regression check)

Every check encodes a defect class found during the day-1/day-2 QA rounds
(2026-10-14..16). Findings use the same type names as the fix playbook in
docs/skill notes (multi-course-data-model.md QA section):
  DOUBLED_EXPECTED          expected answer contains more than one sentence
  EXPECTED_PUNCTUATION      expected not canonical English (missing ? or comma)
  SINGLE_INSTANCE_GAP       english text said once but trailing silence suggests
                            a repeat the transcript missed (needs whisper check)
  UNVERIFIED_REPEAT         whisper shows a repeat the words array does not cover
  ADJACENT_PROMPTS          prompt followed by prompt = missing model replay
                            (donor splice needed BEFORE import)
  PAUSE_CUTS_QUESTION       pauseAt lands before the question's last word ends
  TIGHT_WINDOW              replay starts < 0.3s after pauseAt (cosmetic: the
                            paused state is the real answer window, but flag it)
  QUOTE_LANGUAGE_MISMATCH  narration line quotes English the audio says in Spanish
  SYNTHETIC_TOKEN_RUN       interpolated ~0.5s-step karaoke tokens (text races audio)
  UNCOVERED_SPOKEN_WORD     whisper hears a word (Excelente/Felicidades class)
                            no segment covers
  DURATION_MISMATCH         last segment end vs ffprobe audio duration

Exit code 0 when clean apart from TIGHT_WINDOW notes, 1 otherwise.
"""
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IPLO = ROOT / "scripts" / "iplo"
AUDIO = ROOT / "public" / "audio" / "iplo"

PRAISE_TOKENS = {"excelente", "felicidades", "listo", "perfecto", "muybien", "buentrabajo"}

QUESTION_START = re.compile(r"^(do|does|did|who|what|where|when|why|how|is|are)\b", re.I)


def fold(value: str) -> str:
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = value.lower().replace("\u2019", "").replace("\u2018", "").replace("'", "")
    return "".join(c for c in value if c.isascii() and c.isalpha())


def load(day: int):
    segs_path = IPLO / f"day{day}-segments.json"
    if not segs_path.exists():
        return None, None, 0.0, None
    data = json.loads(segs_path.read_text())
    fill = data.get("fill") or {}
    shift_at = fill.get("at")
    shift = float(fill.get("shift", 0.0)) if shift_at is not None else 0.0
    whisper_path = IPLO / f"day{day}-whisper.json"
    whisper = []
    if whisper_path.exists():
        raw = json.loads(whisper_path.read_text())["segments"][0]["words"]
        whisper = [(w["start"], w["end"], fold(w["word"])) for w in raw if fold(w["word"])]
    return data["segments"], whisper, shift, shift_at


def audio_duration(day: int):
    for name in (f"day-{day}-filled.m4a", f"day-{day}.m4a"):
        path = AUDIO / name
        if path.exists():
            try:
                out = subprocess.run(
                    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "csv=p=0", str(path)],
                    capture_output=True, text=True, timeout=30,
                ).stdout.strip()
                return name, float(out)
            except Exception:
                return name, None
    return None, None


def lint_day(day: int, findings: list):
    segs, whisper, shift, shift_at = load(day)
    if segs is None:
        print(f"day {day}: no segments file, skipped")
        return

    def filled(t):
        return t + shift if shift_at is not None and t >= shift_at else t

    def whisper_span(t0, t1):
        return [(filled(s), t) for s, e, t in whisper if t0 - 0.5 <= filled(s) <= t1 + 0.5]

    def occurrences(tokens, t0, t1):
        hay = whisper_span(t0, t1)
        out = []
        for i in range(len(hay) - len(tokens) + 1):
            if all(hay[i + j][1] == tokens[j] for j in range(len(tokens))):
                out.append((hay[i][0], hay[i + len(tokens) - 1][0]))
        return out

    file_name, duration = audio_duration(day)

    for idx, seg in enumerate(segs):
        at = f"day{day} @{seg['start']:.2f}"

        # --- prompt checks
        if seg["t"] == "prompt":
            for expected in seg.get("expected", []):
                sentences = len(re.findall(r"[.?!]", expected))
                if sentences > 1:
                    findings.append((at, "DOUBLED_EXPECTED", repr(expected)))
                elif QUESTION_START.match(expected) and expected.rstrip().endswith("."):
                    findings.append((at, "EXPECTED_PUNCTUATION", repr(expected)))
                elif re.match(r"^(Yes|No)\b", expected, re.I) and "," not in expected:
                    findings.append((at, "EXPECTED_PUNCTUATION", repr(expected)))
                elif re.match(r"^Who (me|him|her|us|them)\.$", expected, re.I):
                    findings.append((at, "EXPECTED_PUNCTUATION", repr(expected)))

        # --- english checks
        if seg["t"] == "english":
            words = seg.get("words", [])
            if words:
                parts = [p.strip() for p in re.split(r"(?<=[.?!])\s+", seg["text"]) if p.strip()]
                doubled_text = len(parts) >= 2 and fold(parts[0]) == fold(parts[-1])
                gap = seg["end"] - words[-1]["end"]
                if not doubled_text and gap >= 2.0:
                    tokens = [fold(t) for t in re.findall(r"[A-Za-z\u00C0-\u024F\u2019']+", parts[0]) if fold(t)]
                    if len(tokens) >= 2 and whisper:
                        phrase_len = words[-1]["end"] - words[0]["start"]
                        extra = [
                            start for start, end in occurrences(tokens, seg["start"], seg["end"])
                            if start > words[-1]["end"] + 0.8 and end <= seg["end"] - 0.2
                        ]
                        if extra:
                            findings.append((at, "UNVERIFIED_REPEAT",
                                             f"audio repeats {parts[0]!r} at {extra[0]:.2f}; words cover one instance"))
                        else:
                            findings.append((at, "SINGLE_INSTANCE_GAP_NOTE",
                                             f"gap {gap:.2f}s after {parts[0]!r}; no whisper repeat -> possible skipped replay (donor candidate)"))
                # karaoke coverage: text tokens the words array never matches
                if whisper:
                    word_tokens = [fold(w["w"]) for w in words]
                    text_tokens = [fold(t) for t in re.findall(r"[A-Za-z\u00C0-\u024F\u2019']+", seg["text"]) if fold(t)]
                    matched = 0
                    wi = 0
                    for token in text_tokens:
                        for k in range(wi, min(wi + 4, len(word_tokens))):
                            a, b = word_tokens[k], token
                            if a == b or (len(a) >= 2 and len(b) >= 2 and (a.startswith(b) or b.startswith(a))):
                                matched += 1
                                wi = k + 1
                                break
                    if text_tokens and matched / len(text_tokens) < 0.6:
                        findings.append((at, "KARAOKE_COVERAGE",
                                         f"only {matched}/{len(text_tokens)} text tokens match words array"))

        # --- narration checks
        if seg["t"] == "narration":
            words = seg.get("words", [])
            for i in range(len(words) - 4):
                starts = [words[i + j]["start"] for j in range(5)]
                if all(abs((starts[k + 1] - starts[k]) - 0.5) < 0.02 for k in range(4)):
                    findings.append((at, "SYNTHETIC_TOKEN_RUN",
                                     f"tokens {[w['w'] for w in words[i:i+5]]} step uniformly 0.5s"))
                    break
            if whisper:
                span_tokens = {t for s, t in whisper_span(seg["start"], seg["end"])}
                for line in seg.get("lines", []):
                    for quote in re.findall(r"\u201c([^\u201d]+)\u201d", line):
                        toks = [fold(t) for t in re.findall(r"[A-Za-z\u00C0-\u024F\u2019']+", quote) if fold(t)]
                        if len(toks) >= 2 and all(t.isascii() for t in toks) and not any(t in span_tokens for t in toks):
                            findings.append((at, "QUOTE_LANGUAGE_MISMATCH",
                                             f"quoted {quote!r} tokens absent from segment audio"))

        # --- pause sanity
        if seg["t"] == "prompt" and whisper:
            pause = seg.get("pauseAt", seg["start"])
            nxt = segs[idx + 1] if idx + 1 < len(segs) else None
            # The prompt's Spanish request must FINISH before the pause: locate
            # its token sequence in whisper and compare its end against pauseAt.
            # (Day-2 18:28: pauseAt landed between "se dice" and "italiano?".)
            lead_toks = [fold(t) for t in re.findall(r"[A-Za-z\u00C0-\u024F\u2019']+", seg["spanish"]) if fold(t)]
            if len(lead_toks) >= 2:
                occ = occurrences(lead_toks, seg["start"] - 1.0, pause + 4.0)
                if occ:
                    spoken_end = max(end for _, end in occ)
                    if spoken_end > pause + 0.15:
                        findings.append((at, "PAUSE_CUTS_QUESTION",
                                         f"prompt request spoken until {spoken_end:.2f} but pauseAt {pause:.2f}"))
            if nxt and nxt["t"] == "prompt":
                findings.append((at, "ADJACENT_PROMPTS",
                                 f"next segment is another prompt (start {nxt['start']:.2f}) -> missing model replay, donor splice needed"))
            elif nxt and nxt["t"] == "english":
                window = nxt["start"] - pause
                if window < 0.3:
                    findings.append((at, "TIGHT_WINDOW", f"replay starts {window:.2f}s after pauseAt (informational)"))

    # --- uncovered spoken praise/closing words
    if whisper:
        for s, e, t in whisper:
            if t not in PRAISE_TOKENS:
                continue
            s_f = filled(s)
            narr = next((x for x in segs if x["t"] == "narration"
                         and x["start"] - 0.5 <= s_f <= x["end"] + 0.5), None)
            if narr:
                continue
            span = next((x for x in segs if x["t"] in ("narration", "english")
                         and x["start"] - 0.5 <= s_f <= x["end"] + 0.5), None)
            words_end = max((w["end"] for w in span.get("words", [])), default=None) if span else None
            if span is None or (span["t"] == "english" and words_end is not None and s_f > words_end + 1.0):
                findings.append((f"day{day} @{s_f:.2f}", "UNCOVERED_SPOKEN_WORD", f"token {t!r} has no text segment"))

    # --- duration
    if file_name and duration:
        last_end = max(s["end"] for s in segs)
        if abs(last_end - duration) > 1.0:
            findings.append((f"day{day}", "DURATION_MISMATCH",
                             f"last segment end {last_end:.2f} vs {file_name} duration {duration:.2f}"))


def main():
    days = [int(a) for a in sys.argv[1:]] or [2]
    findings: list = []
    for day in days:
        lint_day(day, findings)
    if not findings:
        print("CLEAN: no findings")
        return 0
    notes = 0
    for at, kind, detail in findings:
        marker = "note" if kind in ("TIGHT_WINDOW", "SINGLE_INSTANCE_GAP_NOTE") else "FIND"
        if marker == "note":
            notes += 1
        print(f"[{marker}] {at} {kind}: {detail}")
    real = len(findings) - notes
    print(f"\n{real} findings, {notes} notes")
    return 1 if real else 0


if __name__ == "__main__":
    sys.exit(main())
