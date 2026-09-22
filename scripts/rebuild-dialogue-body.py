#!/usr/bin/env python3
"""rebuild-dialogue-body.py — rewrite body_text for a dialogue in DISPLAY format.

Display format:
  Gordon: Was that the glass of water, Pedro?
  [Pedro watches Brenda for a long moment]
  Brenda: There is, sir. ...

Spoken tokens (names + bracket lines stripped) must still match the words
table 1:1 — this script verifies that before writing.

Usage: python3 scripts/rebuild-dialogue-body.py --slug superstitious-minds
"""

import argparse
import json
import os
import re
import sys
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAULT = os.path.expanduser(
    "~/Documents/Obsidian Vault/Language-Wiki/raw/stories")
VAULT_FILES = {
    "superstitious-minds": ("int dialogues", "Superstitious-Minds.md"),
    "angry-driving": ("pre-int dialogues", "Pre-Angry-Driving.md"),
}


def load_env():
    env = {}
    for line in open(os.path.join(REPO, ".env.local")):
        line = line.strip()
        if line and "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def sb_req(url, key, path, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{url}/rest/v1/{path}",
        data=data,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        method=method,
    )
    return json.load(urllib.request.urlopen(req))


def vault_display_lines(slug):
    """Vault Name-Dialogue format -> display lines."""
    out = []
    subdir, fname = VAULT_FILES[slug]
    with open(os.path.join(VAULT, subdir, fname)) as f:
        started = False
        for raw in f:
            s = raw.strip()
            if s.startswith("# "):
                started = True
                continue
            if not started or not s:
                continue
            if s == "—The End—" or s.startswith(("Comprehension", "Personal")):
                break
            if s == slug.replace("-", " ").title():
                continue
            m = re.match(r"^(Gordon|Pedro|Brenda|Beto|Rebecca|Mother)\s*-\s*(.+)$", s)
            if m:
                name, rest = m.group(1), m.group(2).strip()
                # extract ALL inline stage directions (leading or trailing)
                dirs = re.findall(r"\[[^\]]*\]", rest)
                rest = re.sub(r"\s*\[[^\]]*\]", "", rest).strip()
                for d in dirs:
                    out.append(d)
                if rest:
                    out.append(f"{name}: {rest}")
            elif s.startswith("[") and s.endswith("]"):
                out.append(s)
    return out


def display_to_spoken(display_lines):
    """Display lines -> spoken token list (must equal words table order)."""
    tokens = []
    for line in display_lines:
        if line.startswith("["):
            continue
        stripped = re.sub(r"^[A-Za-zÁÉÍÓÚáéíóúñÑ.' -]+:\s*", "", line)
        tokens.extend(stripped.split())
    return tokens


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", required=True)
    args = ap.parse_args()
    env = load_env()
    url = env["NEXT_PUBLIC_SUPABASE_URL"]
    key = env["SUPABASE_SECRET_KEY"]

    rows = sb_req(url, key, f"stories?select=id,slug&slug=eq.{args.slug}")
    story_id = rows[0]["id"]

    # words table (paginated)
    words, offset = [], 0
    while True:
        page = sb_req(
            url, key,
            f"words?select=position,text&story_id=eq.{story_id}"
            f"&order=position.asc&limit=1000&offset={offset}")
        words.extend(page)
        if len(page) < 1000:
            break
        offset += 1000
    word_texts = [w["text"] for w in words]

    display = vault_display_lines(args.slug)
    spoken = display_to_spoken(display)
    print(f"display lines: {len(display)} | spoken tokens: {len(spoken)} "
          f"| words table: {len(word_texts)}")
    def norm(t):
        return (t.replace("\u2018", "'").replace("\u2019", "'")
                .replace("\u201c", '"').replace("\u201d", '"'))
    if [norm(t) for t in spoken] != [norm(t) for t in word_texts]:
        for i2, (a, b) in enumerate(zip(spoken, word_texts)):
            if norm(a) != norm(b):
                print(f"FIRST MISMATCH pos {i2}: display-spoken={a!r} words={b!r}")
                break
        raise SystemExit("spoken tokens do not match words table - aborting")

    body = "\n\n".join(display)
    sb_req(url, key, f"stories?id=eq.{story_id}", method="PATCH",
           body={"body_text": body})
    print(f"body_text updated to display format ({len(body)} chars)")


if __name__ == "__main__":
    main()
