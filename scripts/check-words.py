#!/usr/bin/env python3
"""check-words.py — verify words table for superstitious-minds (read-only)."""
import json
import os
import urllib.request

os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
env = {}
for line in open(".env.local"):
    line = line.strip()
    if line and "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
url = env["NEXT_PUBLIC_SUPABASE_URL"]
key = env.get("SUPABASE_SECRET_KEY")
sid = "3464d096-a7b6-4c41-8b4c-a396a79d17c3"

def sb_fetch_all(url, key, base_query):
    """Paginate a PostgREST query past the 1000-row default cap."""
    rows, offset = [], 0
    while True:
        req = urllib.request.Request(
            f"{url}/rest/v1/{base_query}&limit=1000&offset={offset}",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
        )
        page = json.load(urllib.request.urlopen(req))
        rows.extend(page)
        if len(page) < 1000:
            return rows
        offset += 1000


w = sb_fetch_all(url, key, f"words?select=position,text&story_id=eq.{sid}&order=position.asc")
print("words in DB (paginated):", len(w), "| first:", w[0]["text"], "| last:", w[-1]["text"])
positions = [x["position"] for x in w]
print("positions contiguous 0..N:", positions == list(range(len(positions))))
