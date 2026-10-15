#!/usr/bin/env python3
"""Iplo missing-audio filler: splice a donor occurrence of a skipped script
line into the recording, then shift every downstream segment timing.

For each SKIPPED_IN_RECORDING finding:
  1. locate the kept duplicate segment (the answer the two script lines share),
  2. insert the donor clip immediately BEFORE the prompt that precedes it,
  3. give the new english segment the donor's word timings shifted to position,
  4. shift every later segment by the inserted duration.

Usage:
  fill_missing_audio.py <findings.json> <report.json> <transcript.json> \
      <mp3> <segments.json> <out_mp3> <out_segments.json>
"""
import json, subprocess, sys


def main():
    findings_f, report_f, transcript_f, mp3, segs_f, out_mp3, out_segs = sys.argv[1:8]
    findings = json.load(open(findings_f, encoding="utf-8"))
    report = json.load(open(report_f, encoding="utf-8"))
    tseg = json.load(open(transcript_f, encoding="utf-8"))
    words = [(w["word"].strip(), round(w["start"], 2), round(w["end"], 2))
             for seg in tseg["segments"] for w in seg.get("words", []) if w["word"].strip()]
    data = json.load(open(segs_f, encoding="utf-8"))
    segs = data["segments"]

    def norm(t):
        return " ".join(t.lower().replace("’", "'").split())

    inserts = []
    for f in findings:
        if f["type"] != "SKIPPED_IN_RECORDING" or not f["donor_candidates"]:
            continue
        if f.get("filled"):
            continue
        donor = f["donor_candidates"][0]
        # kept duplicate: the english segment with the same text nearest the
        # claimed span (both script lines claimed this span; one was deduped)
        span_start = min(e["start"] for e in report if e["idx"] in f["claimed_by"] and e["anchored"])
        keep = min(
            (s for s in segs if s["t"] == "english" and norm(s["text"]) == norm(f["text"])
             and abs(s["start"] - span_start) < 30),
            key=lambda s: abs(s["start"] - span_start),
        )
        keep_idx = segs.index(keep)
        # insertion point: the start of the segment preceding the kept answer
        # (the prompt) - the model line belongs between the intro and the prompt
        ins_at = segs[keep_idx - 1]["start"] if keep_idx > 0 else keep["start"]
        donor_words = [
            {"w": w.split()[0] if False else w, "start": round(w_s - donor["start"], 2) + ins_at,
             "end": round(w_e - donor["start"], 2) + ins_at}
            for w, w_s, w_e in words if donor["start"] - 0.2 <= w_s <= donor["end"] + 0.2
        ]
        f["filled"] = {"donor": donor["start"], "at": ins_at}
        inserts.append({"at": ins_at, "d_start": donor["start"], "d_end": donor["end"],
                        "dur": round(donor["end"] - donor["start"], 2),
                        "speaker": donor["speaker"], "text": f["text"],
                        "words": donor_words})

    if not inserts:
        print("nothing to fill")
        return

    inserts.sort(key=lambda x: -x["at"])
    for ins in inserts:
        print(f"splice {ins['d_start']}-{ins['d_end']} ({ins['dur']}s, {ins['speaker']}) "
              f"at {ins['at']} -> {ins['text'][:40]}")
        cmd = [
            "ffmpeg", "-y", "-v", "error", "-i", mp3, "-filter_complex",
            f"[0]atrim=0:{ins['at']}[a];"
            f"[0]atrim={ins['d_start']}:{ins['d_end']}[b];"
            f"[0]atrim={ins['at']}[c];"
            f"[a][b][c]concat=n=3:v=0:a=1[out]",
            "-map", "[out]", "-c:a", "libmp3lame", "-q:a", "4", out_mp3,
        ]
        subprocess.run(cmd, check=True)
        for s in segs:
            if s.get("start", 0) >= ins["at"] - 0.01:
                s["start"] = round(s["start"] + ins["dur"], 2)
                if s.get("end") is not None:
                    s["end"] = round(s["end"] + ins["dur"], 2)
                if s.get("pauseAt") is not None:
                    s["pauseAt"] = round(s["pauseAt"] + ins["dur"], 2)
                for w in s.get("words", []):
                    w["start"] = round(w["start"] + ins["dur"], 2)
                    w["end"] = round(w["end"] + ins["dur"], 2)
        idx = next(i for i, s in enumerate(segs) if s["start"] >= ins["at"] + ins["dur"] - 0.01)
        segs.insert(idx, {"t": "english", "start": ins["at"],
                          "end": round(ins["at"] + ins["dur"], 2),
                          "text": ins["text"], "words": ins["words"]})
        mp3 = out_mp3

    json.dump(data, open(out_segs, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(findings, open(findings_f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("wrote", out_mp3, "and", out_segs)


if __name__ == "__main__":
    main()
