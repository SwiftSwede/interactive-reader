#!/usr/bin/env python3.11
"""
Evaluate new stories/dialogues that don't yet have difficulty scores.

Scans all 4 story folders in the Obsidian vault for .md files without
a difficulty_score in their frontmatter, runs the full difficulty evaluator
(profiler + rubric), and updates the frontmatter with the results.

Usage:
    python3.11 evaluate_new.py                    # Scan and evaluate all unscored files
    python3.11 evaluate_new.py --dry-run           # Show what would be evaluated without running
    python3.11 evaluate_new.py --folder pre-int-stories   # Only scan one folder

Cost per new file: ~$0.004 (less than half a cent)
"""

import json
import os
import re
import sys
import time
import argparse
import subprocess
from pathlib import Path

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VAULT = os.path.expanduser("~/Documents/Obsidian Vault/Language-Wiki/raw/stories")

FOLDERS = {
    "pre-int-stories": os.path.join(VAULT, "pre-int stories"),
    "int-stories": os.path.join(VAULT, "int stories"),
    "pre-int-dialogues": os.path.join(VAULT, "pre-int dialogues"),
    "int-dialogues": os.path.join(VAULT, "int dialogues"),
}


def has_score(filepath):
    """Check if a .md file already has difficulty_score in frontmatter."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read(500)  # Only read frontmatter
    return "difficulty_score:" in content


def find_unscored(folder_filter=None):
    """Find all .md files without difficulty scores."""
    unscored = []
    for name, folder in FOLDERS.items():
        if folder_filter and name != folder_filter:
            continue
        if not os.path.isdir(folder):
            continue
        for md_file in sorted(Path(folder).glob("*.md")):
            if not has_score(str(md_file)):
                unscored.append({
                    "path": str(md_file),
                    "filename": md_file.name,
                    "corpus": name,
                })
    return unscored


def update_frontmatter(filepath, difficulty_score, cefr_evaluated):
    """Add difficulty_score and cefr_evaluated to YAML frontmatter."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    m = re.match(r'^(---\n)(.*?)(\n---)', content, re.DOTALL)
    if not m:
        print(f"  WARNING: No frontmatter found in {filepath}")
        return False
    
    fm = m.group(2)
    if "difficulty_score:" in fm:
        return False  # Already has it
    
    new_fm = fm + f"\ndifficulty_score: {difficulty_score}\ncefr_evaluated: \"{cefr_evaluated}\""
    new_content = f"{m.group(1)}{new_fm}{m.group(3)}{content[m.end():]}"
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)
    return True


def evaluate_file(filepath, model="z-ai/glm-5.2"):
    """Run the full evaluator on a single file and return (score, cefr) or (None, None)."""
    output_file = "/tmp/eval_new_result.json"
    cmd = [
        sys.executable,
        os.path.join(SCRIPT_DIR, "evaluate_story.py"),
        filepath,
        "--output", output_file,
        "--model", model,
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            return None, None, result.stderr[:200]
        
        with open(output_file, "r") as f:
            data = json.load(f)
        
        score = data["final"]["overall_difficulty"]
        cefr = data["final"]["estimated_cefr"]
        
        # Also copy to results dir for record-keeping
        import shutil
        results_dir = os.path.join(SCRIPT_DIR, "..", "results")
        basename = os.path.basename(filepath).replace(".md", ".json")
        shutil.copy(output_file, os.path.join(results_dir, basename))
        
        return score, cefr, None
    except subprocess.TimeoutExpired:
        return None, None, "timeout"
    except Exception as e:
        return None, None, str(e)


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate new stories/dialogues that don't yet have difficulty scores"
    )
    parser.add_argument("--dry-run", action="store_true", 
                        help="Show unscored files without evaluating them")
    parser.add_argument("--folder", choices=list(FOLDERS.keys()),
                        help="Only scan one folder")
    parser.add_argument("--model", default="z-ai/glm-5.2",
                        help="LLM model (OpenRouter format)")
    args = parser.parse_args()
    
    print("Scanning for unscored stories/dialogues...")
    unscored = find_unscored(args.folder)
    
    if not unscored:
        print("All files already have difficulty scores. Nothing to do.")
        return
    
    print(f"\nFound {len(unscored)} file(s) without difficulty scores:")
    for item in unscored:
        print(f"  [{item['corpus']}] {item['filename']}")
    
    if args.dry_run:
        print(f"\nDry run — would evaluate {len(unscored)} file(s).")
        print(f"Estimated cost: ~${len(unscored) * 0.004:.2f}")
        return
    
    print(f"\nEvaluating {len(unscored)} file(s)...")
    print(f"Estimated cost: ~${len(unscored) * 0.004:.2f}")
    print(f"Estimated time: ~{len(unscored) * 3} minutes\n")
    
    success = 0
    errors = 0
    start_time = time.time()
    
    for i, item in enumerate(unscored):
        print(f"[{i+1}/{len(unscored)}] {item['corpus']:20s} {item['filename']}")
        
        score, cefr, error = evaluate_file(item["path"], args.model)
        
        if score is not None:
            update_frontmatter(item["path"], score, cefr)
            print(f"  -> score={score:.2f}  cefr={cefr}  ✓")
            success += 1
        else:
            print(f"  -> ERROR: {error}")
            errors += 1
        
        # Rate limit between files
        if i < len(unscored) - 1:
            time.sleep(3)
    
    elapsed = time.time() - start_time
    print(f"\nDone in {elapsed/60:.1f} minutes")
    print(f"  Success: {success}")
    print(f"  Errors: {errors}")
    if errors:
        print(f"\n  {errors} file(s) failed. Re-run this script to retry.")


if __name__ == "__main__":
    main()