#!/usr/bin/env python3
"""Iplo script-vs-audio review gate (pipeline step 0).

Runs the existing aligner + discrepancy checker, then formats the results
as a human-readable markdown report for Kyle to review BEFORE the pipeline
continues. Kyle marks each finding: OK / FIX / SKIP, then the pipeline runs.

Pipeline order becomes:
  1. Transcribe audio (whisper small + medium merge) → day{N}-whisper.json
  2. review_script.py <day>  →  Kyle reviews day{N}-review.md
  3. AI fixes spelling/punctuation after approval
  4. align_v3.py → fix_answers_and_pauses.py → lint_segments.py → import

Usage:
  review_script.py <day> [--output <path>]

Requires: day{N}-whisper.json must already exist.
"""
import json, os, subprocess, sys

IPLO = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(IPLO)
SCRIPT_PATH = os.path.expanduser("~/Downloads/Inglés por los Oídos.txt")

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO, **kw)
    return r

def main():
    day = int(sys.argv[1])
    whisper = os.path.join(IPLO, f"day{day}-whisper.json")
    segments = os.path.join(IPLO, f"day{day}-segments.json")
    report_json = f"/tmp/day{day}-align-report.json"
    findings_json = report_json.replace("report", "findings")
    output = os.path.join(IPLO, f"day{day}-review.md")

    for i, arg in enumerate(sys.argv):
        if arg == "--output": output = sys.argv[i + 1]

    if not os.path.exists(whisper):
        print(f"ERROR: {whisper} not found. Run whisper first.")
        sys.exit(1)

    # 1. Run aligner - into a THROWAWAY segments path. The aligner overwrites
    #    its output file, and day{N}-segments.json holds days of hand repairs
    #    (expected arrays, ghost drops, leadEnd, donor fills) that a fresh
    #    alignment would wipe (this destroyed the file once already).
    review_segments = f"/tmp/day{day}-review-segments.json"
    if os.path.exists(segments):
        import shutil; shutil.copy(segments, review_segments)
    print("Running aligner (throwaway copy - production segments untouched)...")
    r = run(["python3", os.path.join(IPLO, "align_v3.py"), whisper, str(day), review_segments, "--report", report_json])
    print(r.stdout.strip())
    if r.returncode != 0:
        print(f"Aligner stderr: {r.stderr[-500:]}")

    # 2. Run discrepancy checker
    print("Checking discrepancies...")
    r2 = run(["python3", os.path.join(IPLO, "verify_alignment.py"),
              report_json, whisper, segments])
    print(r2.stdout.strip())

    # 3. Load results
    align = json.load(open(report_json, encoding="utf-8"))
    findings = []
    if os.path.exists(findings_json):
        findings = json.load(open(findings_json, encoding="utf-8"))
    # index findings by line number
    by_line = {}
    for fnd in findings:
        by_line.setdefault(fnd.get("line"), []).append(fnd)

    # 4. Load script text (for full-line context)
    script_text = open(SCRIPT_PATH, encoding="utf-8").read()
    import re
    m = re.search(rf"(?im)^[\s\ufeff]*Day\s*{day}\b.*$\n", script_text)
    script_lines = []
    if m:
        start = m.end()
        nxt = re.search(rf"(?im)^[\s\ufeff]*Day\s*\d+\b.*$\n", script_text[start:])
        body = script_text[start:start + nxt.start()] if nxt else script_text[start:]
        for raw in body.split("\n"):
            sm = re.match(r"^\s*([A-Za-zÁÉÍÓÚáéíóúñÑ .0-9]+?):\s*(.*)$", raw)
            if sm:
                sp, tx = sm.group(1).strip(), sm.group(2).strip()
                if tx:
                    script_lines.append({"speaker": sp, "text": tx})
            elif raw.strip() and script_lines:
                script_lines[-1]["text"] += " " + raw.strip()

    # 5. Build markdown report
    total = len(align)
    anchored = sum(1 for a in align if a.get("anchored"))
    unanchored = total - anchored
    n_findings = len(findings)

    lines_out = []
    lines_out.append(f"# Day {day} — Script vs Audio Review\n")
    lines_out.append(f"**{total} script lines | {anchored} anchored | {unanchored} unanchored | {n_findings} discrepancy findings**\n")
    lines_out.append(f"\nReview each finding below, then mark:\n")
    lines_out.append(f"- ✅ OK — keep as-is\n")
    lines_out.append(f"- ✏️ FIX — correct the script text to match the audio\n")
    lines_out.append(f"- 🗑️ SKIP — the recording doesn't have it (donor-splice or leave gap)\n")
    lines_out.append(f"\nAfter review, the pipeline continues: `fix_answers → lint → import`\n")
    lines_out.append(f"\n---\n")

    # Group: anchored OK lines → compact; findings + unanchored → detailed
    finding_lines = {f.get("line") for f in findings}

    lines_out.append(f"\n## Discrepancy Findings ({n_findings})\n")
    for fnd in findings:
        ftype = fnd.get("type", "?")
        idx = fnd.get("line", "?")
        sp = fnd.get("speaker", "")
        txt = fnd.get("text", "")[:200]
        lines_out.append(f"\n### 🔴 {ftype} — line {idx} ({sp})\n")
        lines_out.append(f"**Script:** {txt}\n")
        if ftype == "SKIPPED_IN_RECORDING":
            donors = fnd.get("donors", [])
            if donors:
                lines_out.append(f"\n**Donor candidates:** {len(donors)} occurrence(s) elsewhere in the take.\n")
                for d in donors[:3]:
                    lines_out.append(f"  - {d.get('speaker')} at {d.get('start'):.1f}s ({d.get('words')}/{d.get('tokens', '?')} words)\n")
            lines_out.append(f"\n**Decision needed:** splice a donor, or leave as silence?\n")
        elif ftype == "PARTIAL_AUDIO":
            lines_out.append(f"\n**Audio words:** {fnd.get('words', '?')}/{fnd.get('tokens', '?')} tokens matched\n")
            lines_out.append(f"**Heard:** {' '.join(fnd.get('audio_words_in_span', []))}\n")
            lines_out.append(f"\n**Decision needed:** quiet repeat (fill with donor) or substitution (keep as-is)?\n")
        elif ftype == "LANGUAGE_MISMATCH":
            proposal = fnd.get("proposal", "")
            if proposal:
                lines_out.append(f"\n**Audio actually says:** {proposal}\n")
            lines_out.append(f"\n**Decision needed:** update script text to match the recording?\n")
        elif ftype == "SPEAKER_NAME":
            lines_out.append(f"\n**Decision needed:** update speaker label?\n")
        lines_out.append("")

    lines_out.append(f"\n## Unanchored Script Lines ({unanchored})\n")
    lines_out.append(f"These script lines could not be matched to any audio span:\n")
    for a in align:
        if not a.get("anchored"):
            idx = a.get("idx")
            sp = a.get("speaker", "")
            txt = a.get("text", "")[:200]
            lines_out.append(f"\n### ⚪ line {idx} ({sp})\n{txt}\n")
            if idx in finding_lines:
                lines_out.append(f"*(See finding above for details.)*\n")

    lines_out.append(f"\n## Anchored Lines ({anchored}) — OK\n")
    lines_out.append(f"These script lines matched the audio:\n")
    for a in align:
        if a.get("anchored"):
            idx = a.get("idx")
            sp = a.get("speaker", "")
            txt = a.get("text", "")[:120]
            st = a.get("start", 0)
            en = a.get("end", 0)
            lines_out.append(f"- {idx}: {sp} [{st:.1f}s-{en:.1f}s] {txt}\n")

    with open(output, "w", encoding="utf-8") as f:
        f.write("\n".join(lines_out))

    print(f"\nReport written: {output}")
    print(f"Findings: {n_findings} | Unanchored: {unanchored} | Anchored: {anchored}/{total}")

if __name__ == "__main__":
    main()
