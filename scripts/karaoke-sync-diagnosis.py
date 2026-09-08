#!/usr/bin/env python3
"""Diagnose karaoke sync: compare Whisper timestamp word order vs story word order.

Reads .env.local for Supabase creds (secret key bypasses RLS), fetches body_text
and the words table for each slug, loads the timestamps JSON, and reports:
  1. Word-count / contiguity sanity of the words table
  2. Monotonicity of timestamp start times (binary search requirement)
  3. Alignment profile: for each story word, which whisper index it truly
     corresponds to (difflib SequenceMatcher), and the offset (whisper_idx -
     story_idx) — positive = highlight lands AHEAD in the story
  4. Offset jumps (where sync breaks), mapped to audio time and paragraph number
  5. What the app highlights at sample times vs what the audio is saying

Stdlib only. Run from repo root: python3 scripts/karaoke-sync-diagnosis.py
"""

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


def analyze(slug, url, key):
    print("=" * 78)
    print(f"STORY: {slug}")
    print("=" * 78)

    ts_path = os.path.join(AUDIO_DIR, f"{slug}-timestamps.json")
    if not os.path.exists(ts_path):
        print("  (no timestamps file — skipping)")
        return
    timestamps = json.load(open(ts_path))

    stories = sb_select(url, key, "stories", f"select=id,body_text&slug=eq.{slug}")
    if not stories:
        print("  ERROR: story not found in DB")
        return
    story_id, body_text = stories[0]["id"], stories[0]["body_text"]
    words = sb_select(
        url,
        key,
        "words",
        f"select=position,text&story_id=eq.{story_id}&order=position.asc",
    )

    # ── 1. Words table sanity ─────────────────────────────────────
    positions = [w["position"] for w in words]
    contiguous = positions == list(range(len(positions)))
    print(f"words table rows: {len(words)} | positions contiguous 0..N-1: {contiguous}")

    body_tokens = [t for t in body_text.split() if t.strip()]
    print(f"body_text whitespace tokens: {len(body_tokens)}")

    # ── 2. Timestamp monotonicity (binary search requirement) ─────
    bad = [
        (i, timestamps[i - 1]["start"], timestamps[i]["start"])
        for i in range(1, len(timestamps))
        if timestamps[i]["start"] < timestamps[i - 1]["start"]
    ]
    print(f"timestamps entries: {len(timestamps)} | non-monotonic starts: {len(bad)}")
    if bad:
        for i, prev, cur in bad[:5]:
            print(f"   idx {i}: start goes {prev:.2f} -> {cur:.2f}")

    # ── 3. Alignment profile ──────────────────────────────────────
    # The DOM spans the app highlights = words-table order (position order).
    # The timestamps array positions  = Whisper transcript order.
    # Align story words <-> whisper words to find the true mapping.
    s_texts = [w["text"] for w in words]
    s_clean = [clean(t) for t in s_texts]
    w_clean = [clean(t["text"]) for t in timestamps]

    sm = SequenceMatcher(None, s_clean, w_clean, autojunk=False)
    # story position -> whisper index
    true_map = {}
    for b in sm.get_matching_blocks():
        for k in range(b.size):
            true_map[b.a + k] = b.b + k
    print(f"aligned pairs (story word == whisper word): {len(true_map)}/{len(s_clean)}")

    # offset profile over story positions: whisper_idx - story_idx
    # (what the app's naive index=position assumption gets wrong)
    offset_changes = []  # (story_pos, whisper_idx, offset, time)
    prev_off = None
    for sp in range(len(s_clean)):
        if sp not in true_map:
            continue
        widx = true_map[sp]
        off = widx - sp
        if off != prev_off:
            offset_changes.append(
                (sp, widx, off, timestamps[widx]["start"])
            )
            prev_off = off

    print(f"\noffset changes (story_pos, whisper_idx, offset, audio_time): {len(offset_changes)}")
    for sp, widx, off, t in offset_changes:
        print(
            f"  story word {sp:5d} ({s_texts[sp]!r}) <- whisper {widx:5d} | "
            f"offset {off:+4d} | at {t:7.2f}s | "
            f"story ctx: ...{' '.join(s_texts[max(0, sp - 4):sp + 4])}..."
        )

    # ── 4. Paragraph mapping of the big jumps ─────────────────────
    paras = [p for p in body_text.split("\n") if p.strip()]
    para_token_counts = [len(p.split()) for p in paras]
    cum = []
    total = 0
    for c in para_token_counts:
        cum.append(total)
        total += c

    def para_of(token_idx):
        for pi in range(len(cum) - 1, -1, -1):
            if token_idx >= cum[pi]:
                return pi + 1  # 1-indexed paragraph
        return 0

    big_jumps = [c for c in offset_changes if abs(c[2]) >= 5]
    print(f"\nparagraphs in story: {len(paras)}")
    if big_jumps:
        print("BIG offset jumps (>=5 words):")
        for sp, widx, off, t in big_jumps:
            print(
                f"  +{off:-4d} words at audio {t:7.2f}s (~{int(t // 60)}:{int(t % 60):02d}) — "
                f"story word {sp} (paragraph {para_of(sp)}/{len(paras)})"
            )

    # ── 5. What the app highlights vs what's spoken, sampled ───────
    print("\napp behavior samples (what the naive position mapping highlights):")
    for sample_t in [10, 60, 120, 180, 240, 300, 360, 420]:
        # binary search in app: last ts index with start <= t
        lo, hi, idx = 0, len(timestamps) - 1, -1
        while lo <= hi:
            mid = (lo + hi) // 2
            if timestamps[mid]["start"] <= sample_t:
                idx = mid
                lo = mid + 1
            else:
                hi = mid - 1
        if idx < 0:
            continue
        # what the app highlights: story DOM span #idx (if it exists)
        app_word = s_texts[idx] if idx < len(s_texts) else "??"
        # what is actually being spoken: whisper word idx -> true story word
        spoken = next((sp for sp, wi in true_map.items() if wi == idx), None)
        spoken_word = s_texts[spoken] if spoken is not None else "??"
        err = idx - spoken if spoken is not None else 0
        print(
            f"  t={sample_t:3d}s | audio says: {timestamps[idx]['text']!r} (true story word {spoken}: {spoken_word!r}) "
            f"| app highlights story word {idx}: {app_word!r} | error {err:+d} words"
        )
    print()


def main():
    env = load_env(os.path.join(REPO, ".env.local"))
    url = env["NEXT_PUBLIC_SUPABASE_URL"]
    key = env.get("SUPABASE_SECRET_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        print("ERROR: no SUPABASE_SECRET_KEY in .env.local")
        sys.exit(1)

    slugs = sys.argv[1:] or ["flustered-and-driving", "the-soccer-jersey", "one-of-these-days"]
    for slug in slugs:
        try:
            analyze(slug, url, key)
        except Exception as e:
            print(f"  ERROR analyzing {slug}: {e}")


if __name__ == "__main__":
    main()
