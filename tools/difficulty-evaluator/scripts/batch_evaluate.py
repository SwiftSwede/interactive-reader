#!/usr/bin/env python3.11
"""
Batch difficulty evaluator: runs the full pipeline (profiler + rubric)
on all .md files in a set of folders.

Usage:
    python3.11 batch_evaluate.py --output results.json
    python3.11 batch_evaluate.py --folders "/path/to/pre-int stories" "/path/to/int stories" --output results.json
    python3.11 batch_evaluate.py --limit 5 --output results.json  # test with 5 items

By default, processes all four corpora:
  - pre-int stories (58)
  - int stories (58)
  - pre-int dialogues (44)
  - int dialogues (42)
Total: 202 items

At ~2 min per item via OpenRouter, this takes ~6-7 hours.
Progress is saved incrementally — if interrupted, re-run and it will skip
items that are already in the output file.
"""

import json
import os
import sys
import time
import argparse
import subprocess
from pathlib import Path

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Default story folders
VAULT = os.path.expanduser("~/Documents/Obsidian Vault/Language-Wiki/raw/stories")
DEFAULT_FOLDERS = [
    os.path.join(VAULT, "pre-int stories"),
    os.path.join(VAULT, "int stories"),
    os.path.join(VAULT, "pre-int dialogues"),
    os.path.join(VAULT, "int dialogues"),
]


def collect_stories(folders):
    """Collect all .md files from the given folders, labeled by corpus."""
    stories = []
    for folder in folders:
        folder_name = os.path.basename(folder)
        if "pre-int" in folder_name and "dialogue" in folder_name:
            corpus = "pre-int-dialogues"
        elif "pre-int" in folder_name:
            corpus = "pre-int-stories"
        elif "int" in folder_name and "dialogue" in folder_name:
            corpus = "int-dialogues"
        elif "int" in folder_name:
            corpus = "int-stories"
        else:
            corpus = "unknown"
        
        for md_file in sorted(Path(folder).glob("*.md")):
            stories.append({
                "path": str(md_file),
                "filename": md_file.name,
                "corpus": corpus,
            })
    return stories


def run_single_evaluation(story_path, model, output_dir):
    """Run evaluate_story.py on a single story and return the result."""
    output_file = os.path.join(output_dir, os.path.basename(story_path).replace(".md", ".json"))
    
    # Skip if already done (incremental progress)
    if os.path.exists(output_file):
        try:
            with open(output_file, "r") as f:
                existing = json.load(f)
            if "rubric" in existing and "final" in existing:
                return existing, "skipped"
        except (json.JSONDecodeError, KeyError):
            pass  # File exists but is invalid, re-process
    
    cmd = [
        sys.executable,
        os.path.join(SCRIPT_DIR, "evaluate_story.py"),
        story_path,
        "--output", output_file,
        "--model", model,
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            return None, f"error: {result.stderr[:200]}"
        
        with open(output_file, "r") as f:
            return json.load(f), "ok"
    except subprocess.TimeoutExpired:
        return None, "timeout"
    except Exception as e:
        return None, f"error: {str(e)}"


def main():
    parser = argparse.ArgumentParser(description="Batch difficulty evaluator for all stories and dialogues")
    parser.add_argument("--folders", nargs="*", help="Folders to process (default: all four corpora)")
    parser.add_argument("--output", "-o", required=True, help="Output JSON file for combined results")
    parser.add_argument("--model", default="z-ai/glm-5.2", help="LLM model (OpenRouter format)")
    parser.add_argument("--limit", type=int, help="Process only N items (for testing)")
    parser.add_argument("--corpus", help="Process only one corpus (pre-int-stories, int-stories, pre-int-dialogues, int-dialogues)")
    args = parser.parse_args()
    
    folders = args.folders if args.folders else DEFAULT_FOLDERS
    stories = collect_stories(folders)
    
    if args.corpus:
        stories = [s for s in stories if s["corpus"] == args.corpus]
    
    if args.limit:
        stories = stories[:args.limit]
    
    print(f"Total items to process: {len(stories)}")
    for corpus in ["pre-int-stories", "int-stories", "pre-int-dialogues", "int-dialogues"]:
        count = sum(1 for s in stories if s["corpus"] == corpus)
        if count:
            print(f"  {corpus}: {count}")
    print()
    
    # Create output directory for individual results
    output_dir = os.path.join(SCRIPT_DIR, "..", "results")
    os.makedirs(output_dir, exist_ok=True)
    
    results = []
    errors = []
    skipped = 0
    start_time = time.time()
    
    for i, story in enumerate(stories):
        elapsed = time.time() - start_time
        if elapsed > 0 and i > 0:
            rate = i / elapsed * 60  # items per minute
            remaining = (len(stories) - i) / (i / elapsed) if i > 0 else 0
            eta_min = remaining / 60
            print(f"[{i+1}/{len(stories)}] {story['corpus']:20s} {story['filename'][:40]:40s} "
                  f"({rate:.1f}/min, ETA {eta_min:.0f}m)", file=sys.stderr)
        else:
            print(f"[{i+1}/{len(stories)}] {story['corpus']:20s} {story['filename'][:40]:40s}", file=sys.stderr)
        
        result, status = run_single_evaluation(story["path"], args.model, output_dir)
        
        if status == "skipped":
            skipped += 1
            print(f"  -> skipped (already done)", file=sys.stderr)
        elif result:
            results.append({
                "corpus": story["corpus"],
                "filename": story["filename"],
                "story_title": result.get("story_title", ""),
                "overall_difficulty": result.get("final", {}).get("overall_difficulty", 0),
                "estimated_cefr": result.get("final", {}).get("estimated_cefr", ""),
                "profiler": result.get("profiler", {}),
                "rubric": result.get("rubric", {}),
            })
        else:
            errors.append({"story": story["filename"], "error": status})
            print(f"  -> {status}", file=sys.stderr)
        
        # Rate limit: wait 3 seconds between API calls to avoid OpenRouter throttling
        if status != "skipped" and i < len(stories) - 1:
            time.sleep(3)
    
    # Save combined output
    combined = {
        "total_items": len(stories),
        "total_processed": len(results),
        "total_skipped": skipped,
        "total_errors": len(errors),
        "results": results,
        "errors": errors,
    }
    
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)
    
    elapsed_total = time.time() - start_time
    print(f"\nDone in {elapsed_total/60:.1f} minutes", file=sys.stderr)
    print(f"  Processed: {len(results)}", file=sys.stderr)
    print(f"  Skipped: {skipped}", file=sys.stderr)
    print(f"  Errors: {len(errors)}", file=sys.stderr)
    print(f"  Saved to: {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()