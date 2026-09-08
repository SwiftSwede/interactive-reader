#!/usr/bin/env python3
"""Simulate the app's exact render + karaoke behavior to reproduce the bug.

Replicates InteractiveStory.tsx logic in Python:
  1. body_text -> paragraphs -> tokens (same split as the component)
  2. token renders as .word-span IFF words[pos] exists AND normalized texts match
  3. karaoke: binary-search whisper timestamps for audio time t -> index w
  4. highlights spans[w] = the (w+1)-th RENDERED span -> story position P
  5. compares P to the true spoken position (SequenceMatcher inverse map)

Reports: DOM exclusions, error timeline, paragraph jumps (scroll behavior),
and the exact moments that match the student's report.
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


def norm(text):
    # exact normalization the component applies (curly -> straight quotes)
    return (
        text.replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201C", '"')
        .replace("\u201D", '"')
    )


def sb_select(url, key, table, params):
    req = urllib.request.Request(
        f"{url}/rest/v1/{table}?{params}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def clean(text):
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    return re.sub(r"[^a-zA-Z0-9'\-]", "", text).lower().strip()


def simulate(slug, url, key):
    print("=" * 78)
    print(f"SIMULATION: {slug}")
    print("=" * 78)

    ts_path = os.path.join(AUDIO_DIR, f"{slug}-timestamps.json")
    if not os.path.exists(ts_path):
        print("  no timestamps; skip")
        return
    timestamps = json.load(open(ts_path))

    stories = sb_select(url, key, "stories", f"select=id,body_text&slug=eq.{slug}")
    story_id, body_text = stories[0]["id"], stories[0]["body_text"]
    words = sb_select(
        url, key, "words", f"select=position,text&story_id=eq.{story_id}&order=position.asc"
    )
    words_by_pos = {w["position"]: w["text"] for w in words}

    # ── replicate component tokenization ─────────────────────────
    paragraphs = [p for p in body_text.split("\n") if p.strip()]
    tokens = []  # (paragraph_idx, token)
    for pi, p in enumerate(paragraphs):
        for t in re.split(r"\s+", p.strip()):
            if t:
                tokens.append((pi, t))

    # ── replicate render: which tokens get .word-span? ────────────
    rendered = []  # (story_pos, para_idx, token) for each DOM span, in order
    excluded = []  # tokens that render WITHOUT .word-span
    for pos, (pi, tok) in enumerate(tokens):
        wtext = words_by_pos.get(pos)
        if wtext is None or norm(tok) != norm(wtext):
            excluded.append((pos, pi, tok, wtext))
        else:
            rendered.append((pos, pi, tok))

    print(f"tokens: {len(tokens)} | DOM spans: {len(rendered)} | excluded: {len(excluded)}")
    if excluded:
        print(f"\nexcluded tokens (render WITHOUT .word-span -> shift everything after): {len(excluded)}")
        for pos, pi, tok, wtext in excluded[:40]:
            print(f"  pos {pos:4d} para {pi + 1:2d}: body={tok!r} vs words={wtext!r}")

    # ── true spoken position: invert the story<->whisper match ─────
    s_clean = [clean(w["text"]) for w in words]
    s_texts = [w["text"] for w in words]
    w_clean = [clean(t["text"]) for t in timestamps]
    sm = SequenceMatcher(None, s_clean, w_clean, autojunk=False)
    whisper_to_story = {}
    for b in sm.get_matching_blocks():
        for k in range(b.size):
            whisper_to_story[b.b + k] = b.a + k

    # ── karaoke timeline: for every whisper word, what gets highlighted? ──
    # component binary-searches last start <= t; highlight persists between
    # word starts, so per whisper index w the highlighted span is spans[w]
    print(f"\nerror timeline (highlighted story word vs actually-spoken story word):")
    events = []  # (whisper_idx, audio_time, spoken_story_pos, highlighted_story_pos, err)
    for w in range(min(len(timestamps), len(rendered) + 40)):
        t = timestamps[w]["start"]
        spoken = whisper_to_story.get(w)
        if w < len(rendered):
            highlighted = rendered[w][0]
        else:
            highlighted = None  # past the end of the DOM: no highlight
        events.append((w, t, spoken, highlighted))

    # first paragraph where error >= 20 (student: "23 words ahead")
    # and any >=30-paragraph visual jump between consecutive highlights
    def para_of(sp):
        return tokens[sp][0] + 1 if sp is not None and sp < len(tokens) else None

    print("\nmoments where error first hits 15+ words, or jumps 10+ paragraphs:")
    prev_hl_para = None
    seen_big = 0
    for w, t, spoken, highlighted in events:
        if highlighted is None or spoken is None:
            continue
        err = highlighted - spoken
        hl_para = para_of(highlighted)
        if prev_hl_para is not None and hl_para and abs(hl_para - prev_hl_para) >= 10:
            print(
                f"  JUMP @ {t:7.2f}s (~{int(t // 60)}:{int(t % 60):02d}): paragraph "
                f"{prev_hl_para} -> {hl_para} ({hl_para - prev_hl_para:+d}) | whisper word {w} "
                f"({timestamps[w]['text']!r}) | highlighted story word {highlighted} "
                f"vs spoken {spoken} | err {err:+d}"
            )
            seen_big += 1
            if seen_big > 8:
                break
        prev_hl_para = hl_para
        if err >= 15:
            print(
                f"  ERR>=15 first at {t:7.2f}s (~{int(t // 60)}:{int(t % 60):02d}): "
                f"highlighted story word {highlighted} (para {hl_para}) vs spoken {spoken} "
                f"(para {para_of(spoken)}) | err {err:+d}"
            )

    # summary at key times
    print("\nsampled behavior (what the student would see):")
    for sample_t in [30, 120, 180, 210, 240, 270, 300, 360, 420]:
        # binary search: last whisper idx with start <= t
        lo, hi, w = 0, len(timestamps) - 1, -1
        while lo <= hi:
            mid = (lo + hi) // 2
            if timestamps[mid]["start"] <= sample_t:
                w = mid
                lo = mid + 1
            else:
                hi = mid - 1
        spoken = whisper_to_story.get(w)
        highlighted = rendered[w][0] if w < len(rendered) else None
        err = (highlighted - spoken) if (highlighted is not None and spoken is not None) else None
        print(
            f"  t={sample_t:3d}s (~{sample_t // 60}:{sample_t % 60:02d}): audio={timestamps[w]['text']!r:12s}"
            f" spoken_story={spoken} hl_story={highlighted} "
            f"err={err if err is not None else 'past-end':>6}"
        )
    print()


def main():
    env = load_env(os.path.join(REPO, ".env.local"))
    url = env["NEXT_PUBLIC_SUPABASE_URL"]
    key = env.get("SUPABASE_SECRET_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY")
    slugs = sys.argv[1:] or ["flustered-and-driving", "one-of-these-days", "the-soccer-jersey"]
    for slug in slugs:
        try:
            simulate(slug, url, key)
        except Exception as e:
            print(f"ERROR {slug}: {e}")


if __name__ == "__main__":
    main()
