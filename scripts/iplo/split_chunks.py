#!/usr/bin/env python3
"""IPLO pipeline step 1: split a lesson MP3 into utterance chunks + manifest."""
import json, re, subprocess, sys, os

WAV, CHUNK_DIR = sys.argv[1], sys.argv[2]
os.makedirs(CHUNK_DIR, exist_ok=True)

# 1. silence map
p = subprocess.run(["ffmpeg", "-hide_banner", "-i", WAV, "-af",
                    "silencedetect=noise=-35dB:d=0.55", "-f", "null", "/dev/null"],
                   capture_output=True, text=True)
starts, ends = [], []
for line in p.stderr.splitlines():
    if "silence_start" in line:
        starts.append(float(re.search(r"silence_start: ([\d.]+)", line).group(1)))
    elif "silence_end" in line:
        ends.append(float(re.search(r"silence_end: ([\d.]+)", line).group(1)))

dur = float(re.search(r"Duration: (\d+):(\d+):([\d.]+)",
                      subprocess.run(["ffmpeg", "-hide_banner", "-i", WAV], capture_output=True, text=True).stderr).group(0).replace("Duration: ", "")) if False else None
probe = subprocess.run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                        "-of", "csv=p=0", WAV], capture_output=True, text=True)
total = float(probe.stdout.strip())

# 2. speech regions = every gap between silences; merge regions separated by
#    silence < 0.5s; drop tiny fragments < 0.35s only if isolated
gaps = []
t = 0.0
sil = sorted(zip(starts, ends))
for s, e in sil:
    gaps.append((t, s))
    t = e
gaps.append((t, total))

regions = []
for a, b in gaps:
    if b - a <= 0.01:
        continue
    if regions and (a - regions[-1][1]) < 0.5:
        regions[-1] = (regions[-1][0], b)
    else:
        regions.append((a, b))
regions = [(a, b) for a, b in regions if b - a >= 0.35]

manifest = []
for i, (a, b) in enumerate(regions, 1):
    a, b = max(0, a - 0.25), min(total, b + 0.25)
    if b - a > 25:  # split long blocks
        k = int((b - a) // 25) + 1
        for j in range(k):
            c0, c1 = a + j * (b - a) / k, a + (j + 1) * (b - a) / k
            name = f"u{i:03d}_{j}"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{c0:.2f}", "-to", f"{c1:.2f}",
                            "-i", WAV, "-ar", "16000", "-ac", "1", f"{CHUNK_DIR}/{name}.wav"])
            manifest.append({"name": name, "start": round(c0, 2), "end": round(c1, 2)})
    else:
        name = f"u{i:03d}"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.2f}", "-to", f"{b:.2f}",
                        "-i", WAV, "-ar", "16000", "-ac", "1", f"{CHUNK_DIR}/{name}.wav"])
        manifest.append({"name": name, "start": round(a, 2), "end": round(b, 2)})

json.dump(manifest, open(f"{CHUNK_DIR}/manifest.json", "w"), indent=1)
print(f"chunks: {len(manifest)} covering {sum(m['end']-m['start'] for m in manifest):.0f}s of {total:.0f}s")