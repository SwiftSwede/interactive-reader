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
            pause = round(max(s["start"], nxt["start"] - 0.15), 2)
            if abs(pause - s.get("pauseAt", -1)) > 0.01:
                fixed_pause += 1
            s["pauseAt"] = pause
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{path}: {fixed_ans} answer keys deduped, {fixed_pause} pauseAt moved")


if __name__ == "__main__":
    main(sys.argv[1])
