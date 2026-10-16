#!/usr/bin/env python3
"""Post-process an iplo day-segments file in place:

1. Answer key dedupe: the script repeats the student answer (choral style),
   so expected answers came out doubled ("I speak. I speak."). Collapse
   consecutive duplicate answer lines AND a line that is the same phrase said
   twice ("I speak I speak", "You guys speak English. You guys speak English.").
2. pauseAt: was the prompt's aligned span end, which undershoots when trailing
   tokens ("yo hablo") fail to align - the input appeared before the question
   finished playing. The pause belongs just before the answer starts, i.e. at
   the next segment's start minus a small epsilon.
"""
import json, re, sys, unicodedata


def fold(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower()


def toks(text):
    out = []
    for t in re.sub(r"[^\w'\s]", " ", text).split():
        f = fold(t.replace("'", ""))
        if f:
            out.append(f)
    return out


def collapse_repeated_line(line):
    """'I speak I speak' -> 'I speak'; keeps non-repeated lines untouched."""
    t = toks(line)
    if len(t) >= 2 and len(t) % 2 == 0 and t[: len(t) // 2] == t[len(t) // 2:]:
        half = len(t) // 2
        words = re.sub(r"[^\w'\s]", " ", line).split()
        return " ".join(words[:half]) + "."
    return line


def dedupe_expected(expected):
    out = []
    for line in expected:
        line = collapse_repeated_line(line)
        if out and fold(out[-1]) == fold(line):
            continue
        out.append(line)
    return out


LEAD_SEQUENCES = (
    ("dime", "otra", "vez"),
    ("otra", "vez"),
    ("ahora", "dime"),
    ("ahora", "di"),
)


def lead_sequence(spanish):
    folded = fold(spanish).lstrip("¿¡ ")
    for seq in LEAD_SEQUENCES:
        if folded.startswith(" ".join(seq)):
            return seq
    return None


def lead_end(spanish, words, start, pause_at):
    """End of the spoken lead (Otra vez / Ahora di). The input opens here."""
    seq = lead_sequence(spanish)
    if not seq:
        return None
    window = [
        (re.sub(r"[^a-z]", "", fold(w["word"])), w["end"])
        for w in words
        if start - 0.4 <= w["start"] <= pause_at + 0.3
    ]
    for i in range(len(window)):
        idx = i
        last_end = None
        ok = True
        for token in seq:
            found = None
            for j in range(idx, min(len(window), idx + 5)):
                heard = window[j][0]
                same = heard == token or (token and heard.startswith(token))
                gender = token == "otra" and heard in ("otra", "otro")
                if same or gender:
                    found = j
                    break
            if found is None:
                ok = False
                break
            last_end = window[found][1]
            idx = found + 1
        if ok and last_end is not None and start - 0.05 <= last_end < pause_at - 0.15:
            return round(last_end, 2)
    return None


def mark_lead_ends(segs, whisper_path):
    whisper = json.load(open(whisper_path, encoding="utf-8"))
    words = []
    for seg in whisper.get("segments", []):
        words.extend(seg.get("words") or [])
    marked = missed = 0
    for s in segs:
        if s.get("t") != "prompt":
            continue
        if not lead_sequence(s.get("spanish", "")):
            s.pop("leadEnd", None)
            continue
        end = lead_end(s["spanish"], words, s["start"], s.get("pauseAt", s["start"]))
        if end is None:
            s.pop("leadEnd", None)
            missed += 1
            print(f"  no leadEnd {s['start']}: {s['spanish'][:60]}")
            continue
        s["leadEnd"] = end
        marked += 1
    return marked, missed


def main(path):
    d = json.load(open(path, encoding="utf-8"))
    segs = d["segments"]
    fixed_pause = fixed_ans = 0
    for i, s in enumerate(segs):
        if s.get("t") != "prompt":
            continue
        before = list(s["expected"])
        s["expected"] = dedupe_expected(s["expected"])
        if s["expected"] != before:
            fixed_ans += 1
        nxt = segs[i + 1] if i + 1 < len(segs) else None
        if nxt and isinstance(nxt.get("start"), (int, float)):
            # the aligner now computes gap-aware pauses (right after the question
            # when the recording has an answer gap). Only repair a BROKEN pause:
            # at/before the prompt start, or running into/past the next segment.
            pause = s.get("pauseAt", -1)
            broken = pause <= s["start"] or pause >= nxt["start"]
            if broken:
                fixed = round(max(s["start"], nxt["start"] - 0.15), 2)
                if abs(fixed - pause) > 0.01:
                    fixed_pause += 1
                s["pauseAt"] = fixed
    whisper_path = path.replace("-segments.json", "-whisper.json")
    marked = missed = 0
    if whisper_path != path:
        try:
            marked, missed = mark_lead_ends(segs, whisper_path)
        except FileNotFoundError:
            print(f"no whisper file at {whisper_path}, leadEnd left unset")
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{path}: {fixed_ans} answer keys deduped, {fixed_pause} pauseAt moved, {marked} leadEnd set, {missed} missed")


if __name__ == "__main__":
    main(sys.argv[1])
