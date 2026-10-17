#!/usr/bin/env python3.11
"""
Full difficulty evaluator pipeline: profiler + AI rubric.

Usage:
    python3.11 evaluate_story.py <story_file.md>
    python3.11 evaluate_story.py <story_file.md> --output result.json

Requires:
    - vocab_profiler.py in the same directory
    - rubric.md in the same directory
    - An OpenAI-compatible API (uses the HERMES infrastructure or direct API)

This script:
1. Runs the vocab_profiler on the story
2. Builds a prompt with the rubric + story text + profiler output
3. Sends it to an LLM
4. Parses the JSON response
5. Combines profiler + rubric data into a final difficulty profile
"""

import atexit
import json
import os
import sys
import time
import uuid
import argparse
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def load_posthog_env():
    """Load only the public PostHog settings needed by this standalone CLI."""
    env_path = Path(SCRIPT_DIR).parents[2] / ".env.local"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if "=" not in line or line.lstrip().startswith("#"):
            continue
        key, value = line.split("=", 1)
        if key in {"NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"}:
            os.environ.setdefault(key, value.strip().strip('"').strip("'"))


load_posthog_env()
POSTHOG_KEY = os.environ.get("NEXT_PUBLIC_POSTHOG_KEY")
POSTHOG_HOST = os.environ.get("NEXT_PUBLIC_POSTHOG_HOST")

if not POSTHOG_KEY or not POSTHOG_HOST:
    if os.environ.get("NODE_ENV") == "development":
        missing_variable = (
            "NEXT_PUBLIC_POSTHOG_KEY"
            if not POSTHOG_KEY
            else "NEXT_PUBLIC_POSTHOG_HOST"
        )
        raise RuntimeError(
            f"{missing_variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once {missing_variable} is configured"
        )
    posthog_client = None
else:
    from posthog import Posthog

    posthog_client = Posthog(
        POSTHOG_KEY,
        host=POSTHOG_HOST,
        flush_at=1,
        flush_interval=0,
        privacy_mode=False,
        enable_exception_autocapture=True,
    )
    atexit.register(posthog_client.shutdown)

AI_SESSION_ID = str(uuid.uuid4())


def capture_openrouter_generation(prompt, model, result, latency_seconds):
    if not posthog_client:
        return

    content = result["choices"][0]["message"]["content"]
    usage = result.get("usage", {})
    posthog_client.capture(
        distinct_id=AI_SESSION_ID,
        event="$ai_generation",
        properties={
            # This local content tool has no authenticated app user. The
            # process-run session id keeps the event anonymous and prevents a
            # person profile.
            "$process_person_profile": False,
            "$ai_trace_id": str(uuid.uuid4()),
            "$ai_session_id": AI_SESSION_ID,
            "$ai_span_id": str(uuid.uuid4()),
            "$ai_span_name": "evaluate_story_difficulty",
            "$ai_model": model,
            "$ai_provider": "openrouter",
            "$ai_input": [{"role": "user", "content": prompt}],
            "$ai_input_tokens": usage.get("prompt_tokens"),
            "$ai_output_choices": [{"role": "assistant", "content": content}],
            "$ai_output_tokens": usage.get("completion_tokens"),
            "$ai_latency": latency_seconds,
            "$ai_temperature": 0,
            "$ai_max_tokens": 4096,
        },
    )
    posthog_client.flush()


def run_profiler(story_path):
    """Run vocab_profiler.py on a story and return the parsed JSON."""
    cmd = [sys.executable, os.path.join(SCRIPT_DIR, "vocab_profiler.py"), story_path, "--pretty"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Profiler error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    return json.loads(result.stdout)


def load_rubric():
    """Load the rubric prompt."""
    rubric_path = os.path.join(SCRIPT_DIR, "rubric.md")
    with open(rubric_path, "r", encoding="utf-8") as f:
        return f.read()


def extract_story_text(story_path):
    """Extract the raw story text for the LLM to read."""
    # Reuse the profiler's extraction for consistency
    import importlib.util
    spec = importlib.util.spec_from_file_location("vocab_profiler", os.path.join(SCRIPT_DIR, "vocab_profiler.py"))
    vp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(vp)
    return vp.extract_story_body(story_path)


def build_prompt(rubric, story_text, profile):
    """Build the full prompt for the LLM."""
    # Remove the comment lines from the rubric (lines starting with #)
    rubric_lines = [line for line in rubric.split("\n") if not line.startswith("#")]
    rubric_clean = "\n".join(rubric_lines).strip()
    
    prompt = f"""{rubric_clean}

## Input

=== STORY TEXT ===
{story_text}

=== VOCABULARY PROFILE ===
{json.dumps(profile, ensure_ascii=False, indent=2)}
"""
    return prompt


def call_llm(prompt, model="z-ai/glm-5.2"):
    """
    Call an LLM with the prompt via OpenRouter.
    """
    import urllib.request
    
    # Load API key from .env
    env_path = os.path.expanduser("~/.hermes/profiles/profe-kyle/.env")
    api_key = ""
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("OPENROUTER_API_KEY=") and not line.startswith("#"):
                    api_key = line.split("=", 1)[1].strip()
                    break
    
    if not api_key:
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
    
    if not api_key:
        print("ERROR: No OPENROUTER_API_KEY found.", file=sys.stderr)
        sys.exit(1)
    
    base_url = "https://openrouter.ai/api/v1"
    url = f"{base_url}/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0,
        "max_tokens": 4096,
    }
    
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    
    req = urllib.request.Request(url, data=data, headers=headers)
    started_at = time.monotonic()
    
    # Retry with exponential backoff for rate limiting
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                result = json.loads(response.read().decode("utf-8"))
                capture_openrouter_generation(
                    prompt, model, result, time.monotonic() - started_at
                )
                return result["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < max_retries - 1:
                wait = (attempt + 1) * 10
                print(f"  Rate limited (429), retrying in {wait}s...", file=sys.stderr)
                time.sleep(wait)
                # Rebuild request (the previous one was consumed)
                req = urllib.request.Request(url, data=data, headers=headers)
                continue
            print(f"API call failed (HTTP {e.code}): {e.read().decode('utf-8')[:200]}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            if attempt < max_retries - 1:
                wait = (attempt + 1) * 5
                print(f"  API error ({e}), retrying in {wait}s...", file=sys.stderr)
                time.sleep(wait)
                req = urllib.request.Request(url, data=data, headers=headers)
                continue
            print(f"API call failed: {e}", file=sys.stderr)
            sys.exit(1)


def parse_rubric_response(response_text):
    """Extract JSON from the LLM response."""
    # Try to find JSON in the response
    text = response_text.strip()
    
    # Remove markdown code fences if present
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    
    text = text.strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find the first { and last }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start:end+1])
        else:
            print(f"Could not parse JSON from response:\n{text[:500]}", file=sys.stderr)
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Run the full difficulty evaluator on a story")
    parser.add_argument("story", help="Path to the story markdown file")
    parser.add_argument("--output", "-o", help="Save result to file")
    parser.add_argument("--model", default="z-ai/glm-5.2", help="LLM model to use (OpenRouter format)")
    parser.add_argument("--dry-run", action="store_true", help="Print the prompt without calling the LLM")
    args = parser.parse_args()
    
    story_path = os.path.abspath(args.story)
    if not os.path.exists(story_path):
        print(f"Error: {story_path} not found", file=sys.stderr)
        sys.exit(1)
    
    # Step 1: Run profiler
    print("Running vocabulary profiler...", file=sys.stderr)
    profile = run_profiler(story_path)
    print(f"  Profiler done: {profile['unique_word_count']} unique words, "
          f"{profile['evp_coverage_pct']}% EVP coverage, "
          f"adjusted difficulty {profile['vocab_difficulty_adjusted']}", file=sys.stderr)
    
    # Step 2: Load rubric and story text
    rubric = load_rubric()
    story_text = extract_story_text(story_path)
    
    # Step 3: Build prompt
    prompt = build_prompt(rubric, story_text, profile)
    
    if args.dry_run:
        print(prompt)
        return
    
    # Step 4: Call LLM
    print(f"Calling LLM ({args.model})...", file=sys.stderr)
    response = call_llm(prompt, args.model)
    
    # Step 5: Parse response
    rubric_result = parse_rubric_response(response)
    
    # Step 6: Combine profiler + rubric into final profile
    final = {
        "story_title": profile["story_title"],
        "profiler": {
            "word_count": profile["word_count"],
            "unique_word_count": profile["unique_word_count"],
            "evp_coverage_pct": profile["evp_coverage_pct"],
            "level_distribution": profile["level_distribution"],
            "cumulative_pct": profile["cumulative_pct"],
            "cognate_count": profile["cognate_count"],
            "cognate_pct": profile["cognate_pct"],
            "false_friend_count": profile["false_friend_count"],
            "off_list_count": profile["off_list_count"],
            "off_list_pct": profile["off_list_pct"],
            "vocab_difficulty_raw": profile["vocab_difficulty_raw"],
            "vocab_difficulty_adjusted": profile["vocab_difficulty_adjusted"],
            "estimated_cefr": profile["estimated_cefr"],
        },
        "rubric": rubric_result,
        "final": {
            "overall_difficulty": rubric_result.get("overall_difficulty", 0),
            "estimated_cefr": rubric_result.get("estimated_cefr", ""),
        },
    }
    
    output_json = json.dumps(final, ensure_ascii=False, indent=2)
    
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output_json)
        print(f"Result saved to {args.output}", file=sys.stderr)
    else:
        print(output_json)


if __name__ == "__main__":
    main()