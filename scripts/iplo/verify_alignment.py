#!/usr/bin/env python3
"""Iplo script-vs-audio discrepancy auditor.

Reads the aligner's per-line report (--report) plus the transcript union and
classifies every script line that disagrees with the audio:

- SKIPPED_IN_RECORDING: the script says a line, the recording skips it (two
  identical script lines claim one audio span). Fillable by splicing a donor
  occurrence of the same audio part from elsewhere in the MP3.
- PARTIAL_AUDIO: the audio says the line but words are missing (quiet repeats,
  substitutions). Reports which tokens lack timings and whether a donor repeat
  exists.
- LANGUAGE_MISMATCH: a Spanish prompt line whose text contains English (the
  recording says Spanish). Proposes the transcript's own wording.
- SPEAKER_NAME: the script labels a voice Woman/Man while the audio names the
  speaker (e.g. "despues de Sara"). Proposes a mapping.

Usage: verify_alignment.py <report.json> <transcript.json> <segments.json> [original-whisper.json]
"""
import json, re, sys, unicodedata

ENGLISH_MARKERS = re.compile(
    r"\b(when|referring|group|males|consists|both|males|females|women|men|of|or|and the|that)\b", re.I)
SPANISH_STOP = re.compile(
    r"\b(cuando|se|refiere|grupo|hombres|mujeres|ambos|y|o|de|la|el|los|las|que|un|una)\b", re.I)


def fold(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().replace("ü", "ue")


def toks(text):
    text = text.replace("’", "'").replace("‘", "'")
    out = []
    for t in re.sub(r"[^\w'%\s]", " ", text).split():
        f = fold(t.replace("'", ""))
        if f:
            out.append(f)
    return out


def load_words(path):
    j = json.load(open(path, encoding="utf-8"))
    return [(fold(re.sub(r"[^\w'%]", "", w["word"].strip().replace("'", ""))), w["start"], w["end"])
            for seg in j["segments"] for w in seg.get("words", []) if w["word"].strip()]


def main():
    report = json.load(open(sys.argv[1], encoding="utf-8"))
    words = load_words(sys.argv[2])
    segs = json.load(open(sys.argv[3], encoding="utf-8"))["segments"]

    findings = []

    # --- SKIPPED_IN_RECORDING: identical adjacent script lines sharing a span
    by_text = {}
    for e in report:
        if e["anchored"]:
            by_text.setdefault(fold(re.sub(r"[^\w'\s]", " ", e["text"]).strip()), []).append(e)
    for text, entries in by_text.items():
        for i in range(len(entries) - 1):
            a, b = entries[i], entries[i + 1]
            overlap = a["end"] > b["start"] - 0.5 and abs(a["start"] - b["start"]) < 30
            if overlap:
                # donors: full-coverage occurrences OUTSIDE the claimed span,
                # same speaker preferred (splicing a different voice changes
                # who the student hears)
                donors = [
                    {k: e2[k] for k in ("idx", "speaker", "start", "end", "words")}
                    for e2 in entries
                    if e2 is not a and e2["words"] >= a["tokens"]
                    and not (e2["start"] < b["end"] + 1 and e2["end"] > a["start"] - 1)
                ]
                donors.sort(key=lambda d: (d["speaker"] != a["speaker"], abs(d["start"] - a["start"])))
                findings.append({
                    "type": "SKIPPED_IN_RECORDING",
                    "line": a["idx"], "speaker": a["speaker"], "text": a["text"],
                    "claimed_by": [a["idx"], b["idx"]],
                    "gap_before": [s["start"] for s in segs
                                   if s.get("end") and abs(s["end"] - a["start"]) < 30][:1],
                    "donor_candidates": donors[:4],
                })

    # --- PARTIAL_AUDIO: anchored but words < tokens
    for e in report:
        if e["anchored"] and e["words"] < e["tokens"]:
            span_words = [w[0] for w in words if e["start"] - 0.5 <= w[1] <= e["end"] + 0.5]
            findings.append({
                "type": "PARTIAL_AUDIO",
                "line": e["idx"], "speaker": e["speaker"], "text": e["text"],
                "words": e["words"], "tokens": e["tokens"],
                "audio_words_in_span": span_words,
            })

    # --- LANGUAGE_MISMATCH: a Profe line whose script text is not what the
    # audio says (Kyle translating on the fly). General matched-ratio test on
    # ALL Profe lines: a legit English quote inside Spanish narration still
    # matches (whisper heard it), a wholesale translation does not. The
    # proposal is the transcript's own wording over the line's span.
    tseg_txt = json.load(open(sys.argv[4], encoding="utf-8")) if len(sys.argv) > 4 else {"segments": []}
    for e in report:
        if not e["anchored"] or not e["speaker"].startswith("Profe"):
            continue
        script_toks = toks(e["text"])
        if len(script_toks) < 4:
            continue
        span_words = [w[0] for w in words if e["start"] - 0.5 <= w[1] <= e["end"] + 0.5]
        span_set = set(span_words)
        matched = sum(1 for t in script_toks
                      if t in span_set or any(t[:3] == s[:3] for s in span_set))
        ratio = matched / len(script_toks)
        if ratio < 0.5:
            said = " ".join(seg["text"].strip() for seg in tseg_txt["segments"]
                            if e["start"] - 0.5 <= seg["start"] <= e["end"])
            findings.append({
                "type": "LANGUAGE_MISMATCH",
                "line": e["idx"], "speaker": e["speaker"], "text": e["text"],
                "match_ratio": round(ratio, 2),
                "proposal": said.strip(),
            })

    # --- SPEAKER_NAME: names mentioned in the audio/script vs labels
    tseg = json.load(open(sys.argv[2], encoding="utf-8"))
    transcript_text = " ".join(seg.get("text", "") for seg in tseg["segments"])
    names = set()
    for m in re.finditer(r"\b(Sara|Sarah|Sim[oó]n|Jon[aá]s|Mateo)\b", transcript_text, re.I):
        names.add(m.group(1))
    labels = sorted({e["speaker"] for e in report})
    if names:
        findings.append({
            "type": "SPEAKER_NAME",
            "labels": labels,
            "names_mentioned_in_audio": sorted(names),
            "note": "script labels Woman/Man; audio names the voices - confirm mapping",
        })

    json.dump(findings, open(sys.argv[1].replace("report", "findings"), "w"),
              ensure_ascii=False, indent=1)
    for f in findings:
        print(f"\n== {f['type']}")
        for k, v in f.items():
            if k != "type":
                print(f"   {k}: {str(v)[:110]}")
    print(f"\n{len(findings)} findings -> {sys.argv[1].replace('report', 'findings')}")


if __name__ == "__main__":
    main()
