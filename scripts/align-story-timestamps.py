#!/usr/bin/env python3
"""Align Whisper timestamps to story word positions — the step generate-timestamps.py skips.

generate-timestamps.py numbers words in WHISPER'S heard order. The karaoke
component, however, highlights the Nth rendered .word-span, which follows the
story's word positions (words table order). Any drift between the two orders
(e.g. Kyle saying "even more late" while Whisper/the text disagree, or an LLM
annotation normalizing "'em" to "them") accumulates and desyncs the highlight.

This script re-maps an existing {slug}-timestamps.json onto story positions:

  1. Fetch words table (position, text) for the slug from Supabase (secret key)
  2. SequenceMatcher-align story words <-> whisper words (fuzzy-cleaned)
  3. For each story position, take its matched whisper word's start/end;
     unmatched words interpolate between neighbours (zero-duration handoff)
  4. Enforce monotonic non-decreasing starts (binary-search requirement)
  5. Cross-check words table == body_text tokens; fail loudly on mismatch
  6. Write the file back (keeping a .bak alongside), with text = story token

Usage:
  python3 scripts/align-story-timestamps.py --slug flustered-and-driving
  python3 scripts/align-story-timestamps.py --slug X --dry-run   (report only)
"""

import argparse
import json
import os
import re
import sys
import urllib.request
from difflib import SequenceMatcher

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(REPO, "public", "audio", "stories")


def load_env(path):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def clean(text):
    """Normalize for matching: lowercase, strip punctuation, normalize quotes."""
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    return re.sub(r"[^a-zA-Z0-9'\-]", "", text).lower().strip()


def sb_select(url, key, table, params):
    req = urllib.request.Request(
        f"{url}/rest/v1/{table}?{params}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    env = load_env(os.path.join(REPO, ".env.local"))
    url = env["NEXT_PUBLIC_SUPABASE_URL"]
    key = env.get("SUPABASE_SECRET_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        sys.exit("ERROR: no SUPABASE_SECRET_KEY in .env.local")

    ts_path = os.path.join(AUDIO_DIR, f"{args.slug}-timestamps.json")
    if not os.path.exists(ts_path):
        sys.exit(f"ERROR: {ts_path} not found")
    timestamps = json.load(open(ts_path))

    stories = sb_select(url, key, "stories", f"select=id,body_text&slug=eq.{args.slug}")
    if not stories:
        sys.exit(f"ERROR: story {args.slug!r} not found")
    story_id, body_text = stories[0]["id"], stories[0]["body_text"]
    words = sb_select(
        url, key, "words",
        f"select=position,text&story_id=eq.{story_id}&order=position.asc",
    )
    if not words:
        sys.exit(f"ERROR: no words rows for {args.slug!r}")

    story_texts = [w["text"] for w in words]
    body_tokens = [t for t in body_text.split() if t.strip()]

    # ── Step 5 first (cheap): words table must mirror body_text tokens ──
    # Use the same quote normalization as InteractiveStory.tsx's render check
    # (tokenNorm === wordNorm) — curly vs straight quotes is a MATCH for the
    # renderer, so it must not fail here either.
    def norm(t):
        return (
            t.replace("\u2018", "'").replace("\u2019", "'")
            .replace("\u201C", '"').replace("\u201D", '"')
        )

    mismatches = [
        (i, bt, wt)
        for i, (bt, wt) in enumerate(zip(body_tokens, story_texts))
        if norm(bt) != norm(wt)
    ] + [
        (i, bt, None)
        for i, bt in enumerate(
            body_tokens[len(story_texts):], start=len(story_texts)
        )
    ]
    if len(body_tokens) != len(story_texts) or mismatches:
        print(f"FAIL: words table ({len(story_texts)} rows) != body_text "
              f"({len(body_tokens)} tokens) — {len(mismatches)} mismatched")
        for i, bt, wt in mismatches[:20]:
            print(f"  pos {i}: body={bt!r} words={wt!r}")
        sys.exit(
            "Fix the words table first (re-run annotate-story.ts or patch the "
            "mismatched rows). Karaoke would desync on every mismatch."
        )
    print(f"words table matches body_text: {len(story_texts)} tokens, 0 mismatches")

    # ── Step 2: align story words <-> whisper words ──────────────────
    s_clean = [clean(t) for t in story_texts]
    w_clean = [clean(t["text"]) for t in timestamps]
    sm = SequenceMatcher(None, s_clean, w_clean, autojunk=False)
    story_to_whisper = {}
    for b in sm.get_matching_blocks():
        for k in range(b.size):
            story_to_whisper[b.a + k] = b.b + k
    print(f"whisper words: {len(timestamps)} | matched to story: "
          f"{len(story_to_whisper)}/{len(s_clean)}")

    # ── Step 3+4: build story-position entries, monotonic ───────────
    out = []
    prev_start = 0.0
    prev_end = 0.0
    unmatched = 0
    for pos in range(len(story_texts)):
        widx = story_to_whisper.get(pos)
        if widx is not None:
            start = timestamps[widx]["start"]
            end = timestamps[widx]["end"]
        else:
            unmatched += 1
            # zero-duration handoff at the previous word's end
            start = prev_end
            end = prev_end
        # enforce monotonic non-decreasing starts (binary-search requirement)
        start = max(start, prev_start)
        end = max(end, start)
        out.append({
            "position": pos,
            "text": story_texts[pos],
            "start": round(start, 2),
            "end": round(end, 2),
        })
        prev_start = start
        prev_end = max(prev_end, end)

    print(f"unmatched story words (zero-duration handoff): {unmatched}")

    # sanity: no highlight beyond audio end, positions contiguous
    audio_end = max(w["end"] for w in timestamps)
    late = [o for o in out if o["end"] > audio_end + 0.01]
    if late:
        print(f"WARNING: {len(late)} entries end after audio end "
              f"({audio_end:.2f}s) — clamping")
        for o in late:
            o["end"] = audio_end
            o["start"] = min(o["start"], audio_end)
    assert [o["position"] for o in out] == list(range(len(out))), "positions not contiguous"

    # ── Report the diff ──────────────────────────────────────────────
    changed = sum(
        1 for old, new in zip(timestamps, out)
        if old["position"] != new["position"] or old["start"] != new["start"]
    )
    print(f"entries changed vs existing file: {changed}/{len(out)}")
    print(f"first: {out[0]}")
    print(f"last:  {out[-1]}")

    if args.dry_run:
        print("dry-run: not writing")
        return

    backup = ts_path + ".bak"
    with open(backup, "w") as f:
        json.dump(timestamps, f, indent=2)
    with open(ts_path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"wrote {ts_path} (backup at {backup})")


if __name__ == "__main__":
    main()
