#!/usr/bin/env python3
"""IPLO pipeline step 2 (v3): DP token alignment of script lines to chunk transcripts.

Needleman-Wunsch over script tokens vs transcript tokens (monotonic). Per script
line: aligned span -> segment. English lines get word timings; prompt lines get
expected answers from the FOLLOWING script English lines (authoritative answer key).
Narration = everything not prompt/english.
"""
import json, re, sys, unicodedata

SCRIPT = "/Users/kylote/Downloads/Inglés por los Oídos.txt"


def fold(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().replace("ü", "ue")


def toks_of(text):
    text = text.replace("’", "'").replace("`", "'").replace("‘", "'")
    out = []
    for t in re.sub(r"[¿¡\[\]{}\"“”«».,;:!?—–…()-]", " ", text).split():
        t = re.sub(r"[^\w'%]", "", t, flags=re.UNICODE)
        f = fold(t.replace("'", ""))
        if f:
            out.append(f)
    return out


def parse_script(body):
    lines = []
    for raw in body.split("\n"):
        m = re.match(r"^\s*([A-Za-zÁÉÍÓÚáéíóúñÑ .0-9]+?):\s*(.*)$", raw)
        if m:
            sp, tx = m.group(1).strip(), m.group(2).strip()
            if tx:
                lines.append([sp, tx])
        elif raw.strip() and lines:
            lines[-1][1] += " " + raw.strip()
    return lines


def load_word_stream(chunk_dir):
    manifest = json.load(open(f"{chunk_dir}/manifest.json"))
    words = []
    for m in manifest:
        try:
            j = json.load(open(f"{chunk_dir}/{m['name']}.wav.json"))
        except Exception:
            continue
        for seg in j["transcription"]:
            for tok in seg.get("tokens", []):
                txt = tok["text"]
                if txt.startswith("[_"):
                    continue
                t0 = m["start"] + tok["offsets"]["from"] / 1000.0
                t1 = m["start"] + tok["offsets"]["to"] / 1000.0
                piece = txt.strip()
                if not piece:
                    continue
                if txt.startswith(" ") or not words:
                    words.append([piece, t0, t1])
                else:
                    words[-1][0] += piece
                    words[-1][2] = t1
    out = []
    for w, a, b in words:
        w = re.sub(r"[^\w'%]", "", w, flags=re.UNICODE)
        f = fold(w.replace("'", ""))
        if f:
            out.append([f, a, b])
    return out


def load_whisper_words(path):
    """Word stream from a single whisper --word_timestamps JSON (full file)."""
    j = json.load(open(path, encoding="utf-8"))
    out = []
    for seg in j["segments"]:
        for w in seg.get("words", []):
            piece = w["word"].strip()
            f = fold(re.sub(r"[^\w'%]", "", piece.replace("'", "")))
            if f:
                out.append([f, w["start"], w["end"]])
    return out


def align(st, tw):
    """Needleman-Wunsch. Returns aligned transcript index per script token (or None)."""
    n, m = len(st), len(tw)
    GAP = -0.35
    # dp over (n+1)x(m+1)
    prev = [GAP * j for j in range(m + 1)]
    back = [[0] * (m + 1) for _ in range(n + 1)]  # 0=diag 1=up(skip script) 2=left(skip transcript)
    for i in range(1, n + 1):
        cur = [prev[0] + GAP]
        sw = st[i - 1]
        for j in range(1, m + 1):
            twj = tw[j - 1][0].strip("'")
            if sw == twj:
                s = 1.0
            elif sw[:3] == twj[:3] and sw[:3]:
                s = 0.4
            else:
                s = GAP * 2
            diag = prev[j - 1] + s
            up = prev[j] + GAP
            left = cur[j - 1] + GAP
            best = diag
            b = 0
            if up > best:
                best, b = up, 1
            if left > best:
                best, b = left, 2
            cur.append(best)
            back[i][j] = b
        prev = cur
    # traceback
    a = [None] * (n + 1)
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            b = back[i][j]
            if b == 0:
                a[i] = j
                i -= 1
                j -= 1
            elif b == 1:
                i -= 1
            else:
                j -= 1
        elif i > 0:
            i -= 1
        else:
            j -= 1
    return a


def local_refine(T, tw, lo, hi):
    """In-order greedy match of line tokens T against transcript words in the
    window [lo, hi]. Returns the best-coverage index list (script-token order),
    or None. Fixes the DP's one-word drift on repetitive lines."""
    best_cnt, best = 0, None
    for s in range(max(0, lo), min(len(tw), hi + 1)):
        j = s
        matched = []
        for t in T:
            k = j
            found = None
            while k <= min(len(tw) - 1, hi + 6) and k - j <= 6:
                w = tw[k][0].strip("'")
                if w == t or (w[:3] == t[:3] and t[:3]):
                    found = k
                    break
                k += 1
            if found is not None:
                matched.append(found)
                j = found + 1
            else:
                matched.append(None)
        cnt = sum(1 for m in matched if m is not None)
        if cnt > best_cnt:
            best_cnt, best = cnt, matched
        if cnt == len(T):
            break
    return best


def main():
    chunk_dir, day, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    text = open(SCRIPT, encoding="utf-8", errors="replace").read()
    parts = re.split(r"(?im)^[\s\ufeff]*(?:Day|DAY)\s*(\d+)\b.*$", text)
    days = {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}
    lines = parse_script(days[day])
    if chunk_dir.endswith(".json"):
        tw = load_whisper_words(chunk_dir)
    else:
        tw = load_word_stream(chunk_dir)
    print(f"script lines: {len(lines)}, transcript words: {len(tw)}")

    # script token stream with per-line ranges
    st, line_ranges = [], []
    for sp, line in lines:
        t = toks_of(line)
        line_ranges.append((len(st), len(st) + len(t), sp, line))
        st.extend(t)
    a = align(st, tw)

    def line_span(k):
        i0, i1, sp, line = line_ranges[k]
        js = [a[i + 1] for i in range(i0, i1) if a[i + 1] is not None]
        if len(js) < max(1, int(0.5 * (i1 - i0))):
            return None
        # refine: in-order rematch inside a small window around the DP span
        T = st[i0:i1]
        refined = local_refine(T, tw, min(js) - 3, max(js) + 6)
        if refined:
            r_cnt = sum(1 for m in refined if m is not None)
            if r_cnt >= len(js):
                js = [m for m in refined if m is not None]
        return min(js), max(js), len(js) / (i1 - i0), js

    spans = [line_span(k) for k in range(len(lines))]

    # fallback for lines the DP dropped: in-order rematch in the window between
    # the nearest anchored neighbours
    for k, (i0, i1, sp, line) in enumerate(line_ranges):
        if spans[k] is not None:
            continue
        lo, hi = None, None
        for pk in range(k - 1, -1, -1):
            if spans[pk]:
                lo = spans[pk][3][-1]
                break
        for nk in range(k + 1, len(line_ranges)):
            if spans[nk]:
                hi = spans[nk][3][0]
                break
        if lo is None and hi is None:
            continue
        lo2 = (lo - 2) if lo is not None else max(0, (hi or 0) - 200)
        hi2 = (hi + 2) if hi is not None else lo + 200
        refined = local_refine(st[i0:i1], tw, lo2, hi2)
        if refined:
            js = [m for m in refined if m is not None]
            if len(js) >= max(1, int(0.5 * (i1 - i0))):
                spans[k] = (min(js), max(js), len(js) / (i1 - i0), js)

    PROMPT_RE = re.compile(r"(¿?\s*(?:cómo se dice|y cómo se dice|cómo dirías)|ahora di|¿puedes adivinar qué palabra significa)", re.I)
    RP_PROMPT_RE = re.compile(r"(cont[ée]stale|dile esto|preg[úu]ntale|contesta|hazle saber)", re.I)
    NARR_HINT_RE = re.compile(r"^(as[íi] es|escucha y repite|as[íi] es como)", re.I)

    def is_prompt_line(sp, line):
        if not sp.startswith("Profe"):
            return False
        if NARR_HINT_RE.search(line):
            return False
        if "ahora di" in line.lower() or "ahora escucha cómo" in line.lower():
            return True
        if RP_PROMPT_RE.search(line):
            return True
        if "¿" in line and PROMPT_RE.search(line):
            return True
        return False

    PROMPT_TRIGGER_RE = re.compile(
        r"(?i)(?:y\s+)?(?:ahora\s+dime,?\s*)?(?:otra\s+vez\.?\s*)?(?:dime\s+)?(?:y\s+)?cómo se dice|ahora di\b|ahora dime\b|¿puedes adivinar|cont[ée]stale|dile esto|preg[úu]ntale|hazle saber")

    def split_narration_prefix(line):
        """A script line can merge narration + the prompt trigger (continuation
        lines get appended). Split so the narration prefix is not part of the
        prompt's aligned span."""
        m = PROMPT_TRIGGER_RE.search(line)
        if not m or m.start() == 0:
            return None
        prefix, prompt = line[: m.start()].strip(" ,."), line[m.start():].strip()
        if len(toks_of(prefix)) < 6:
            return None
        return prefix, prompt

    segs, misses = [], []
    for k, (i0, i1, sp, line) in enumerate(line_ranges):
        span = spans[k]
        is_prompt = is_prompt_line(sp, line)
        is_kyle = sp.startswith("Profe")
        if span is None:
            if is_prompt:
                # transcript may have translated this line to English (whisper
                # does that on Spanish prompts) - still emit it, interpolated
                # between the anchored neighbours so the pause still happens
                prev_end, next_start = None, None
                for pk in range(k - 1, -1, -1):
                    if spans[pk]:
                        prev_end = tw[spans[pk][1]][2]
                        break
                for nk in range(k + 1, len(line_ranges)):
                    if spans[nk]:
                        next_start = tw[spans[nk][0]][1]
                        break
                start = (prev_end + 0.3) if prev_end is not None else 0.0
                pause = (next_start - 0.15) if next_start is not None else start + 1
                exp = []
                m2 = k + 1
                while m2 < len(lines) and not lines[m2][0].startswith("Profe"):
                    if re.search(r"[A-Za-z]", lines[m2][1]):
                        exp.append(lines[m2][1])
                    m2 += 1
                dedup = []
                for e in exp:
                    t = toks_of(e)
                    if len(t) >= 2 and len(t) % 2 == 0 and t[: len(t) // 2] == t[len(t) // 2:]:
                        e = " ".join(re.sub(r"[^\w'\s]", " ", e).split()[: len(t) // 2]) + "."
                    if dedup and fold(dedup[-1]) == fold(e):
                        continue
                    dedup.append(e)
                segs.append({"t": "prompt", "start": round(start, 2), "pauseAt": round(pause, 2),
                             "spanish": line, "expected": dedup})
            else:
                misses.append((sp, line))
            continue
        w0, w1, cov, js = span
        start, end = tw[w0][1], tw[w1][2]
        if is_prompt:
            # narration prefix merged into the line (continuation lines) -> emit separately
            split = split_narration_prefix(line)
            prompt_text = line
            if split:
                prefix, prompt_text = split
                segs.append({"t": "narration", "start": round(start, 2), "end": round(start, 2),
                             "lines": [prefix]})
            # audio pauses AFTER the question is asked, before the confirmation
            exp = []
            m2 = k + 1
            while m2 < len(lines) and not lines[m2][0].startswith("Profe"):
                if re.search(r"[A-Za-z]", lines[m2][1]):
                    exp.append(lines[m2][1])
                m2 += 1
            # the script repeats the answer (choral style): collapse repeats
            dedup = []
            for e in exp:
                t = toks_of(e)
                if len(t) >= 2 and len(t) % 2 == 0 and t[: len(t) // 2] == t[len(t) // 2:]:
                    e = " ".join(re.sub(r"[^\w'\s]", " ", e).split()[: len(t) // 2]) + "."
                if dedup and fold(dedup[-1]) == fold(e):
                    continue
                dedup.append(e)
            exp = dedup
            # pause just BEFORE the answer starts (next line's first word), never
            # at this span's end: unaligned trailing tokens would cut the question
            pause = end
            if m2 <= len(line_ranges) - 1 and spans[m2]:
                pause = tw[spans[m2][0]][1] - 0.15
            segs.append({"t": "prompt", "start": round(start, 2), "pauseAt": round(pause, 2),
                         "spanish": prompt_text, "expected": exp})

        elif not is_kyle:
            words = [tw[j] for j in js]
            # drop any token whose word is not in this line's text (bleed from
            # neighbouring lines) so karaoke never lights the wrong word
            allowed = {}
            for t in toks_of(line):
                allowed[t] = allowed.get(t, 0) + 1
            kept, used = [], {}
            for w in words:
                c = used.get(w[0], 0)
                if allowed.get(w[0], 0) > c:
                    used[w[0]] = c + 1
                    kept.append(w)
            words = kept
            segs.append({"t": "english", "start": round(start, 2), "end": round(end, 2),
                         "text": line,
                         "words": [{"w": w, "start": round(x, 2), "end": round(y, 2)} for w, x, y in words]})
        else:
            if segs and segs[-1]["t"] == "narration":
                segs[-1]["end"] = round(end, 2)
                segs[-1]["lines"] = segs[-1].get("lines", []) + [line]
            else:
                segs.append({"t": "narration", "start": round(start, 2), "end": round(end, 2),
                             "lines": [line]})

    # order segments by time; a segment may never run past the next one
    segs.sort(key=lambda s: (s["start"], 0 if s["t"] == "narration" else 1))
    for k in range(len(segs) - 1):
        nxt = segs[k + 1]["start"]
        if segs[k].get("end", 0) > nxt:
            segs[k]["end"] = round(nxt, 2)
        elif segs[k].get("end", 0) < nxt:
            segs[k]["end"] = round(nxt, 2)
    if segs:
        segs[-1]["end"] = max(segs[-1].get("end", 0), tw[-1][2])

    matched = len([s for s in spans if s])
    print(f"anchored {matched}/{len(lines)} lines ({100*matched/len(lines):.0f}%)")
    for s in segs:
        if s["t"] != "english":
            continue
        n_text = len(toks_of(s["text"]))
        if len(s["words"]) < n_text:
            print(f"  WORDGAP {s['start']}: {len(s['words'])}/{n_text} words - {s['text'][:60]}")
    for sp, line in misses[:14]:
        print(f"  MISS {sp}: {line[:70]}")
    prompts = [s for s in segs if s["t"] == "prompt"]
    eng = [s for s in segs if s["t"] == "english"]
    print(f"segments: {len(segs)} (prompts {len(prompts)}, english {len(eng)}, narration {len(segs)-len(prompts)-len(eng)})")
    json.dump({"lesson": day, "segments": segs}, open(out, "w"), ensure_ascii=False, indent=1)
    print("wrote", out)


main()