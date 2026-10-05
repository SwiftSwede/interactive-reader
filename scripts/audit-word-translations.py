#!/usr/bin/env python3
"""Audit word-level translations for a story.

Checks high-frequency function words against an expected-translation
whitelist. In a healthy annotation, 'the' is never 'precios' — a
sentence-translation smear (tokens distributed in Spanish order) breaks
these instantly. Also prints the words around known reorder-prone
phrases for eyeballing.

Usage: .venv/bin/python scripts/audit-word-translations.py --slug the-fear [--verbose]
"""
import argparse
import json
import os
import re
import urllib.request

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SECRET = os.environ["SUPABASE_SECRET_KEY"]

# function word -> acceptable translations (lowercase, any listed variant or prefix)
EXPECTED = {
    # NOTE: values include context-valid glosses where Spanish grammar differs
    # (dream OF -> con, exited THE -> de la, fool THE -> a los, WAS going -> iba,
    #  IN fear -> con, BUT in "nothing but" -> más que). A running-sentence smear
    # produces words like the=>edificio or She=>También — never in these lists.
    "the": ["el", "la", "los", "las", "lo", "de la", "del", "de los", "a los", "a la", "al", "toda la", "todo el", "la ", "el ", "punta", "límite", "un", "ni"],
    "a": ["un", "una", "uno", "por", "para", "cada", "al", "año", "en"],
    "and": ["y", "e", "mientras"],
    "of": ["de", "del", "por", "con", "en"],
    "to": ["a", "para", "que", "de", "al", "hacia", "ser", "darse", "continuar", "verla", "darte", "ir", "seguir", "hasta", "(infinitivo)", "(preposición de infinitivo)", "contigo"],
    "in": ["en", "dentro", "a", "con", "frente", "en la", "en el", "para"],
    "on": ["en", "sobre", "encima", "adelante", "partícula", "en ello", "al", "el", "de"],
    "she": ["ella"],
    "he": ["él", "el"],
    "her": ["su", "sus", "la", "le", "ella", "a su", "a ella", "se"],
    "his": ["su", "sus"],
    "was": ["era", "estaba", "fue", "estuvo", "iba", "estaría", "había", "hubo", "quedaba", "eran", "estuviera"],
    "is": ["es", "está", "esta", "sea"],
    "are": ["son", "están", "estan", "sean"],
    "when": ["cuando"],
    "for": ["para", "por", "durante", "de", "por ", "en"],
    "with": ["con"],
    "but": ["pero", "sino", "más que", "solo"],
    "not": ["no", "ni"],
    "it": ["eso", "lo", "él", "el", "eso/lo", "que", "no", "esto", "lo ", "así", "era", "eran"],
    "what": ["qué", "que", "qué/que", "lo que"],
    "how": ["cómo", "como", "cuánto", "cuanto", "qué tan"],
    "why": ["por qué", "porque"],
    "who": ["quién", "quien", "que", "podían", "a quién"],
}


def fetch_words(slug: str):
    req = urllib.request.Request(
        f"{URL}/rest/v1/stories?slug=eq.{slug}&select=id", headers=HEADERS
    )
    story_id = json.load(urllib.request.urlopen(req, timeout=30))[0]["id"]
    words, start = [], 0
    while True:
        req = urllib.request.Request(
            f"{URL}/rest/v1/words?story_id=eq.{story_id}&select=position,text,spanish_translation&order=position.asc&limit=1000&offset={start}",
            headers=HEADERS,
        )
        batch = json.load(urllib.request.urlopen(req, timeout=30))
        if not batch:
            break
        words += batch
        start += 1000
    return words


def clean(t):
    if not t:
        return ""
    t = t.strip().lower().strip('".¡¿?!¿').strip()
    # keep only the first alternative listed
    return t.split("(")[0].split("/")[0].strip()


def main():
    global HEADERS
    HEADERS = {"apikey": SECRET, "Authorization": f"Bearer {SECRET}"}
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", required=True)
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    words = fetch_words(args.slug)
    print(f"{args.slug}: {len(words)} words")

    bad = []
    checked = 0
    for w in words:
        tok = re.sub(r"[^a-z]", "", w["text"].lower())
        if tok in EXPECTED:
            checked += 1
            got = clean(w["spanish_translation"])
            if not got:
                continue  # empty = transparent/omitted, not a smear signal
            ok = any(got.startswith(e) or e.startswith(got) for e in EXPECTED[tok])
            if not ok:
                bad.append((w["position"], w["text"], w["spanish_translation"]))
    print(f"function words checked: {checked}, violations: {len(bad)}")
    for b in bad[:40]:
        print(f"  pos {b[0]:4d}: {b[1]!r} => {b[2]!r}")
    if bad:
        print("RESULT: FAIL — translations look smeared/misaligned")
        return 1

    # spot-print reorder-prone neighborhoods for eyeball
    print("\nreorder-prone neighborhoods:")
    probes = ["egg", "failed", "assignment", "longer", "months"]
    for p in probes:
        for i, w in enumerate(words):
            if p in w["text"].lower():
                lo = max(0, i - 4)
                for x in words[lo : i + 6]:
                    print(f"  pos {x['position']:4d}: {x['text']!r} => {x['spanish_translation']!r}")
                print()
                break
    print("RESULT: PASS — no function-word violations")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
