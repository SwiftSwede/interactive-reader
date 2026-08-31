#!/usr/bin/env python3.11
"""
Vocabulary Profiler for Profe Kyle's Story Difficulty Evaluator

Takes a story (markdown file or raw text), tokenizes it, and produces a
vocabulary difficulty profile by checking each word against three databases:

1. EVP wordlist (CEFR levels A1-C2)
2. English-Spanish cognates (true cognates = easier for Spanish speakers)
3. False cognates (false friends = harder for Spanish speakers)

Output: JSON with vocabulary breakdown, cognate flags, false friend flags,
and summary statistics that feed into the AI rubric.

Usage:
    python3.11 vocab_profiler.py <story_file.md>
    python3.11 vocab_profiler.py --text "raw story text"
    python3.11 vocab_profiler.py --batch /path/to/stories/folder/
"""

import json
import os
import re
import sys
import argparse
from collections import Counter
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")

EVP_PATH = os.path.join(DATA_DIR, "evp_wordlist.json")
COGNATES_PATH = os.path.join(DATA_DIR, "cognates_en_es.json")
FALSE_COGNATES_PATH = os.path.join(DATA_DIR, "false_cognates.json")

# ── Load data files (once, at import) ─────────────────────────────────
def _load_json(path):
    if not os.path.exists(path):
        print(f"WARNING: Data file not found: {path}", file=sys.stderr)
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

EVP = _load_json(EVP_PATH)
COGNATES = _load_json(COGNATES_PATH)
FALSE_COGNATES = _load_json(FALSE_COGNATES_PATH)

# Build false cognate lookup: english word -> entry
FALSE_COG_DICT = {}
if isinstance(FALSE_COGNATES, list):
    for entry in FALSE_COGNATES:
        FALSE_COG_DICT[entry["english"].lower()] = entry

# ── CEFR level ordering ────────────────────────────────────────────────
LEVEL_ORDER = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}

# ── Tokenizer ──────────────────────────────────────────────────────────
# Simple but effective for English prose:
#   - lowercase
#   - extract word tokens (alphabetic sequences, including apostrophes for contractions)
#   - strip leading/trailing apostrophes
#   - handle common contractions by expanding the base word

# ── Irregular form → base form map ────────────────────────────────────
# Common English irregular verbs and plurals that simple stemming can't handle
IRREGULAR_MAP = {
    # be
    "am": "be", "is": "be", "are": "be", "was": "be", "were": "be",
    "been": "be", "being": "be", "isn": "be",
    # have
    "had": "have", "has": "have", "having": "have",
    # do
    "did": "do", "does": "do", "done": "do", "doing": "do",
    # go
    "went": "go", "gone": "go", "going": "go", "goes": "go",
    # come
    "came": "come", "coming": "come", "comes": "come",
    # see
    "saw": "see", "seen": "see", "seeing": "see", "sees": "see",
    # get
    "got": "get", "gotten": "get", "getting": "get", "gets": "get",
    # make
    "made": "make", "making": "make", "makes": "make",
    # take
    "took": "take", "taken": "take", "taking": "take", "takes": "take",
    # give
    "gave": "give", "given": "give", "giving": "give", "gives": "give",
    # find
    "found": "find", "finding": "find", "finds": "find",
    # think
    "thought": "think", "thinking": "think", "thinks": "think",
    # know
    "knew": "know", "known": "know", "knowing": "know", "knows": "know",
    # tell
    "told": "tell", "telling": "tell", "tells": "tell",
    # say
    "said": "say", "saying": "say", "says": "say",
    # feel
    "felt": "feel", "feeling": "feel", "feels": "feel",
    # leave
    "left": "leave", "leaving": "leave", "leaves": "leave",
    # put
    "putting": "put", "puts": "put",
    # begin
    "began": "begin", "begun": "begin", "beginning": "begin", "begins": "begin",
    # hold
    "held": "hold", "holding": "hold", "holds": "hold",
    # stand
    "stood": "stand", "standing": "stand", "stands": "stand",
    # understand
    "understood": "understand", "understanding": "understand", "understands": "understand",
    # meet
    "met": "meet", "meeting": "meet", "meets": "meet",
    # run
    "ran": "run", "running": "run", "runs": "run",
    # sit
    "sat": "sit", "sitting": "sit", "sits": "sit",
    # fall
    "fell": "fall", "fallen": "fall", "falling": "fall", "falls": "fall",
    # grow
    "grew": "grow", "grown": "grow", "growing": "grow", "grows": "grow",
    # throw
    "threw": "throw", "thrown": "throw", "throwing": "throw", "throws": "throw",
    # draw
    "drew": "draw", "drawn": "draw", "drawing": "draw", "draws": "draw",
    # drink
    "drank": "drink", "drunk": "drink", "drinking": "drink", "drinks": "drink",
    # eat
    "ate": "eat", "eaten": "eat", "eating": "eat", "eats": "eat",
    # swim
    "swam": "swim", "swum": "swim", "swimming": "swim", "swims": "swim",
    # ring
    "rang": "ring", "rung": "ring", "ringing": "ring", "rings": "ring",
    # sing
    "sang": "sing", "sung": "sing", "singing": "sing", "sings": "sing",
    # wear
    "wore": "wear", "worn": "wear", "wearing": "wear", "wears": "wear",
    # tear
    "tore": "tear", "torn": "tear", "tearing": "tear", "tears": "tear",
    # bear
    "bore": "bear", "born": "bear", "bearing": "bear", "bears": "bear",
    # catch
    "caught": "catch", "catching": "catch", "catches": "catch",
    # teach
    "taught": "teach", "teaching": "teach", "teaches": "teach",
    # fight
    "fought": "fight", "fighting": "fight", "fights": "fight",
    # buy
    "bought": "buy", "buying": "buy", "buys": "buy",
    # bring
    "brought": "bring", "bringing": "bring", "brings": "bring",
    # choose
    "chose": "choose", "chosen": "choose", "choosing": "choose", "chooses": "choose",
    # sleep
    "slept": "sleep", "sleeping": "sleep", "sleeps": "sleep",
    # keep
    "kept": "keep", "keeping": "keep", "keeps": "keep",
    # sweep
    "swept": "sweep", "sweeping": "sweep", "sweeps": "sweep",
    # weep
    "wept": "weep", "weeping": "weep", "weeps": "weep",
    # creep
    "crept": "creep", "creeping": "creep", "creeps": "creep",
    # lose
    "lost": "lose", "losing": "lose", "loses": "lose",
    # shoot
    "shot": "shoot", "shooting": "shoot", "shoots": "shoot",
    # hit
    "hitting": "hit", "hits": "hit",
    # hurt
    "hurting": "hurt", "hurts": "hurt",
    # shut
    "shutting": "shut", "shuts": "shut",
    # cut
    "cutting": "cut", "cuts": "cut",
    # cost
    "costing": "cost", "costs": "cost",
    # burst
    "bursting": "burst", "bursts": "burst",
    # spread
    "spreading": "spread", "spreads": "spread",
    # build
    "built": "build", "building": "build", "builds": "build",
    # lend
    "lent": "lend", "lending": "lend", "lends": "lend",
    # send
    "sent": "send", "sending": "send", "sends": "send",
    # spend
    "spent": "spend", "spending": "spend", "spends": "spend",
    # bend
    "bent": "bend", "bending": "bend", "bends": "bend",
    # rent
    "rented": "rent", "renting": "rent", "rents": "rent",
    # mean
    "meant": "mean", "meaning": "mean", "means": "mean",
    # learn
    "learnt": "learn", "learned": "learn", "learning": "learn", "learns": "learn",
    # burn
    "burnt": "burn", "burned": "burn", "burning": "burn", "burns": "burn",
    # deal
    "dealt": "deal", "dealing": "deal", "deals": "deal",
    # feed
    "fed": "feed", "feeding": "feed", "feeds": "feed",
    # lead
    "led": "lead", "leading": "lead", "leads": "lead",
    # light
    "lit": "light", "lighting": "light", "lights": "light",
    # lie (recline)
    "lay": "lie", "lain": "lie", "lying": "lie", "lies": "lie",
    # strike
    "struck": "strike", "stricken": "strike", "striking": "strike", "strikes": "strike",
    # ride
    "rode": "ride", "ridden": "ride", "riding": "ride", "rides": "ride",
    # rise
    "rose": "rise", "risen": "rise", "rising": "rise", "rises": "rise",
    # raise
    "raised": "raise", "raising": "raise", "raises": "raise",
    # freeze
    "froze": "freeze", "frozen": "freeze", "freezing": "freeze", "freezes": "freeze",
    # steal
    "stole": "steal", "stolen": "steal", "stealing": "steal", "steals": "steal",
    # speak
    "spoke": "speak", "spoken": "speak", "speaking": "speak", "speaks": "speak",
    # break
    "broke": "break", "broken": "break", "breaking": "break", "breaks": "break",
    # wake
    "woke": "wake", "woken": "wake", "waking": "wake", "wakes": "wake",
    # drive
    "drove": "drive", "driven": "drive", "driving": "drive", "drives": "drive",
    # write
    "wrote": "write", "written": "write", "writing": "write", "writes": "write",
    # stick
    "stuck": "stick", "sticking": "stick", "sticks": "stick",
    # dig
    "dug": "dig", "digging": "dig", "digs": "dig",
    # hang
    "hung": "hang", "hanging": "hang", "hangs": "hang",
    # shine
    "shone": "shine", "shining": "shine", "shines": "shine",
    # win
    "won": "win", "winning": "win", "wins": "win",
    # lose
    "lost": "lose", "losing": "lose", "loses": "lose",
    # Irregular plurals
    "men": "man", "women": "woman", "children": "child",
    "feet": "foot", "teeth": "tooth", "geese": "goose",
    "mice": "mouse", "people": "person",
    "lives": "life", "knives": "knife", "wives": "wife",
    "leaves": "leaf", "thieves": "thief", "wolves": "wolf",
    "shelves": "shelf", "selves": "self", "halves": "half",
    "loaves": "loaf", "calves": "calf",
    # Possessive pronouns that might not be in EVP
    "mine": "my", "yours": "your", "hers": "her", "ours": "our", "theirs": "their",
    # Common contractions fragments
    "didn": "do", "doesn": "do", "don": "do", "isn": "be", "aren": "be",
    "wasn": "be", "weren": "be", "hasn": "have", "haven": "have", "hadn": "have",
    "couldn": "could", "shouldn": "should", "wouldn": "would", "won": "will",
    "ll": "will", "ve": "have", "re": "be", "d": "would",
}


CONTRACTION_MAP = {
    "don't": "do", "doesn't": "does", "didn't": "did",
    "can't": "can", "won't": "will", "wouldn't": "would",
    "shouldn't": "should", "couldn't": "could",
    "isn't": "is", "aren't": "are", "wasn't": "was", "weren't": "were",
    "hasn't": "has", "haven't": "have", "hadn't": "had",
    "i'm": "i", "you're": "you", "we're": "we", "they're": "they",
    "he's": "he", "she's": "she", "it's": "it",
    "that's": "that", "what's": "what", "who's": "who",
    "here's": "here", "there's": "there",
    "let's": "let",
    "i've": "i", "you've": "you", "we've": "we", "they've": "they",
    "i've": "i", "he's": "he", "she's": "she",
    "i'd": "i", "you'd": "you", "he'd": "he", "she'd": "she",
    "we'd": "we", "they'd": "they",
    "i'll": "i", "you'll": "you", "he'll": "he", "she'll": "she",
    "we'll": "we", "they'll": "they",
    "gonna": "going", "wanna": "want", "gotta": "got",
    "ain't": "is",
    "y'all": "you",
}

# Common English stopwords (we don't count these in difficulty, but we do count them for coverage)
STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
    "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to",
    "from", "up", "down", "in", "out", "on", "off", "over", "under",
    "again", "further", "once", "here", "there", "all", "any", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "of", "is", "am", "was", "were", "be", "been", "being", "are",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "can", "shall",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
    "us", "them", "my", "your", "his", "its", "our", "their",
    "this", "that", "these", "those", "what", "which", "who", "whom",
    "as", "because", "until", "while", "also", "but",
    "get", "got", "go", "goes", "going", "gone",
}

def simple_stem(word):
    """
    Simple suffix stripper for common English inflections.
    Returns a list of candidate base forms to try in the EVP.
    """
    candidates = []
    
    # Past tense: -ied -> -y (tried -> try)
    if word.endswith('ied') and len(word) > 4:
        candidates.append(word[:-3] + 'y')
    
    # Past tense: -ed (walked -> walk, liked -> like)
    if word.endswith('ed') and len(word) > 4:
        candidates.append(word[:-2])     # walked -> walk
        candidates.append(word[:-1])     # liked -> like
    
    # Present participle: -ing (going -> go, making -> make)
    if word.endswith('ing') and len(word) > 5:
        candidates.append(word[:-3])     # going -> go
        candidates.append(word[:-3] + 'e')  # making -> make
    
    # Plural / 3rd person: -ies -> -y (bodies -> body)
    if word.endswith('ies') and len(word) > 4:
        candidates.append(word[:-3] + 'y')
    
    # Plural / 3rd person: -es (boxes -> box, makes -> make)
    if word.endswith('es') and len(word) > 3:
        candidates.append(word[:-2])     # boxes -> box
        candidates.append(word[:-1])     # makes -> make
    
    # Plural / 3rd person: -s (days -> day)
    if word.endswith('s') and len(word) > 3:
        candidates.append(word[:-1])
    
    # Adverb: -ly (slowly -> slow)
    if word.endswith('ly') and len(word) > 4:
        candidates.append(word[:-2])
    
    # Comparative: -er (taller -> tall)
    if word.endswith('er') and len(word) > 4:
        candidates.append(word[:-2])
    
    # Superlative: -est (strongest -> strong)
    if word.endswith('est') and len(word) > 5:
        candidates.append(word[:-3])
    
    return candidates


def lookup_word(word):
    """
    Look up a word in the EVP, trying the word itself, then irregular forms,
    then simple stemming. Returns (level, source, method) or None.
    """
    # Direct lookup
    if word in EVP:
        e = EVP[word]
        return (e["level"], e.get("source", ""), "direct")
    
    # Irregular form lookup
    if word in IRREGULAR_MAP:
        base = IRREGULAR_MAP[word]
        if base in EVP:
            e = EVP[base]
            return (e["level"], e.get("source", ""), f"irregular:{base}")
    
    # Simple stemming
    for cand in simple_stem(word):
        if cand in EVP:
            e = EVP[cand]
            return (e["level"], e.get("source", ""), f"stemmed:{cand}")
    
    return None


def tokenize(text):
    """
    Tokenize English text into word tokens.
    Returns list of (word, base_for_lookup) tuples.
    Strips markdown formatting, extracts the story body only.
    """
    # Strip YAML frontmatter
    text = re.sub(r'^---\n.*?\n---\n', '', text, flags=re.DOTALL)
    
    # Strip markdown headings markers (#, ##, etc) but keep the text
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    
    # Strip markdown emphasis markers
    text = re.sub(r'\*+', '', text)
    text = re.sub(r'_+', '', text)
    
    # Strip the —The End— marker
    text = re.sub(r'—The End—|—THE END—', '', text)
    
    # Extract words: sequences of letters and apostrophes
    raw_tokens = re.findall(r"[a-zA-Z']+", text)
    
    words = []
    for token in raw_tokens:
        word = token.lower().strip("'")
        if not word:
            continue
        # Skip pure numbers (already filtered by regex) and single letters
        # except meaningful ones
        if len(word) == 1 and word not in ('a', 'i'):
            continue
        # Expand contractions to base form for tokenization
        if word in CONTRACTION_MAP:
            base = CONTRACTION_MAP[word]
            words.append((word, base))
        else:
            words.append((word, word))
    
    return words


def extract_story_title(filepath):
    """Extract story title from markdown file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        # Try YAML frontmatter first
        m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
        if m:
            for line in m.group(1).split('\n'):
                if line.startswith('title:'):
                    return line.split(':', 1)[1].strip()
        # Fall back to first heading
        m = re.match(r'^#\s+(.+)$', content, re.MULTILINE)
        if m:
            return m.group(1).strip()
    except Exception:
        pass
    return os.path.basename(filepath)


def extract_story_body(filepath):
    """Extract just the story body from a markdown file (strip frontmatter, heading, metadata)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Strip YAML frontmatter
    content = re.sub(r'^---\n.*?\n---\n', '', content, flags=re.DOTALL)
    
    # Strip the first heading line (title repeat)
    content = re.sub(r'^#\s+.+\n+', '', content)
    
    # Strip section headers that aren't part of the story
    # (Comprehension Questions, Personal Questions, Extreme Pronunciation, etc.)
    story_end_markers = [
        r'Comprehension Questions',
        r'Personal Questions',
        r'Extreme Pronunciation',
        r'True or False',
        r'Práctica Coral',
        r'—The End—',
        r'—THE END—',
    ]
    for marker in story_end_markers:
        content = re.split(marker, content, maxsplit=1)[0]
    
    return content.strip()


# ── Core profiler ──────────────────────────────────────────────────────

def profile_text(text, story_title=""):
    """
    Run the full vocabulary profile on raw text.
    
    Returns a dict with:
      - total_words: total word count
      - unique_words: unique word count
      - evp_coverage: % of unique words found in EVP
      - level_distribution: {A1: pct, A2: pct, ...} 
      - cognate_words: list of words that are true cognates
      - false_friend_words: list of words that are false friends
      - off_list_words: words not in EVP (excluding proper nouns)
      - difficulty_summary: composite signals
    """
    tokens = tokenize(text)
    
    # Count total words (all tokens)
    total_words = len(tokens)
    
    # Get unique words (use the base form for lookup)
    unique_raw = Counter()
    unique_bases = Counter()
    for word, base in tokens:
        unique_raw[word] += 1
        unique_bases[base] += 1
    
    unique_words = set(unique_bases.keys())
    
    # ── EVP lookup (with irregular forms + stemming) ──────────────────
    level_counts = Counter()
    evp_found = {}
    off_list = []
    lookup_methods = Counter()
    
    for word in unique_words:
        result = lookup_word(word)
        if result:
            level, source, method = result
            level_counts[level] += 1
            evp_found[word] = {"level": level, "source": source, "method": method}
            lookup_methods[method.split(":")[0]] += 1
        else:
            off_list.append(word)
    
    # ── Cognate lookup ────────────────────────────────────────────────
    cognate_hits = []
    for word in unique_words:
        if word in COGNATES:
            cognate_hits.append({
                "english": word,
                "spanish": COGNATES[word],
                "evp_level": evp_found.get(word, {}).get("level", "off-list")
            })
    
    # ── False cognate lookup ──────────────────────────────────────────
    false_friend_hits = []
    for word in unique_words:
        if word in FALSE_COG_DICT:
            fc = FALSE_COG_DICT[word]
            false_friend_hits.append({
                "english": word,
                "spanish": fc["spanish"],
                "english_meaning": fc["english_meaning"],
                "spanish_meaning": fc["spanish_meaning"],
                "evp_level": evp_found.get(word, {}).get("level", "off-list")
            })
    
    # ── Compute statistics ───────────────────────────────────────────
    evp_covered = sum(level_counts.values())
    evp_coverage_pct = (evp_covered / len(unique_words) * 100) if unique_words else 0
    
    # Level distribution as percentages of evp-covered words
    level_distribution = {}
    for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
        if evp_covered > 0:
            level_distribution[level] = round(level_counts[level] / evp_covered * 100, 1)
        else:
            level_distribution[level] = 0
    
    # Cumulative: what % of vocabulary is at or below each level
    cumulative = {}
    for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
        below = sum(level_counts[l] for l in LEVEL_ORDER if LEVEL_ORDER[l] <= LEVEL_ORDER[level])
        cumulative[level] = round(below / len(unique_words) * 100, 1) if unique_words else 0
    
    # Weighted vocabulary difficulty score (1-6 scale, mapped to A1=1 through C2=6)
    if evp_covered > 0:
        weighted_sum = sum(level_counts[level] * LEVEL_ORDER[level] for level in level_counts)
        vocab_difficulty_raw = weighted_sum / evp_covered
    else:
        vocab_difficulty_raw = 0
    
    # Cognate-adjusted difficulty:
    # Cognates are "free" for Spanish speakers — subtract their weight
    # False friends add difficulty — add a penalty
    cognate_words_at_each_level = Counter()
    for hit in cognate_hits:
        level = hit["evp_level"]
        if level in LEVEL_ORDER:
            cognate_words_at_each_level[level] += 1
    
    # Effective difficulty: remove cognates from the "hard" count
    # A B2 cognate like "obligation" is actually easy for Spanish speakers
    non_cognate_level_counts = Counter()
    for level in level_counts:
        non_cognate_level_counts[level] = level_counts[level] - cognate_words_at_each_level.get(level, 0)
    
    # Recompute weighted difficulty without cognates
    non_cognate_total = sum(non_cognate_level_counts.values())
    if non_cognate_total > 0:
        non_cog_weighted = sum(non_cognate_level_counts[l] * LEVEL_ORDER[l] for l in non_cognate_level_counts)
        adjusted_difficulty = non_cog_weighted / non_cognate_total
    else:
        adjusted_difficulty = 0
    
    # False friend penalty: each false friend adds 0.1 to the difficulty score
    # (calibrated so 5 false friends add 0.5, roughly shifting a story up half a CEFR level)
    false_friend_penalty = len(false_friend_hits) * 0.1
    adjusted_difficulty_with_penalty = min(adjusted_difficulty + false_friend_penalty, 6.0)
    
    # ── Filter off-list words: separate likely proper nouns from genuine unknowns ──
    # Heuristic: words that appear in the story with initial capital are likely proper nouns
    # We can't do that from lowercased tokens, so we flag words that are very short or look like names
    # For now, just report them all and let the AI rubric sort it out
    likely_proper_nouns = []
    likely_unknown = []
    for word in sorted(off_list):
        # Very rough heuristic: if the word is short and not in common English, might be a name
        # The AI rubric will handle this better
        likely_unknown.append(word)
    
    # ── Build output ──────────────────────────────────────────────────
    profile = {
        "story_title": story_title,
        "word_count": total_words,
        "unique_word_count": len(unique_words),
        "evp_coverage_pct": round(evp_coverage_pct, 1),
        "level_distribution": {
            "A1": level_counts["A1"],
            "A2": level_counts["A2"],
            "B1": level_counts["B1"],
            "B2": level_counts["B2"],
            "C1": level_counts["C1"],
            "C2": level_counts["C2"],
        },
        "level_distribution_pct": level_distribution,
        "cumulative_pct": cumulative,
        "cognate_count": len(cognate_hits),
        "cognate_pct": round(len(cognate_hits) / len(unique_words) * 100, 1) if unique_words else 0,
        "cognates": sorted(cognate_hits, key=lambda x: x["english"]),
        "false_friend_count": len(false_friend_hits),
        "false_friends": sorted(false_friend_hits, key=lambda x: x["english"]),
        "off_list_count": len(off_list),
        "off_list_pct": round(len(off_list) / len(unique_words) * 100, 1) if unique_words else 0,
        "off_list_words": sorted(off_list),
        "lookup_methods": dict(lookup_methods),
        "vocab_difficulty_raw": round(vocab_difficulty_raw, 2),
        "vocab_difficulty_adjusted": round(adjusted_difficulty_with_penalty, 2),
        "vocab_difficulty_notes": {
            "raw_meaning": "Average CEFR level (1-6) of EVP-matched words, no cognate adjustment",
            "adjusted_meaning": "CEFR level after removing cognates (free for Spanish speakers) and adding false-friend penalty (+0.1 each)",
            "cognates_removed": dict(cognate_words_at_each_level),
            "false_friend_penalty": false_friend_penalty,
        },
        "estimated_cefr": _estimate_cefr(adjusted_difficulty_with_penalty, cumulative, level_counts),
    }
    
    return profile


def _estimate_cefr(adjusted_score, cumulative, level_counts):
    """
    Estimate the CEFR level of the text based on adjusted difficulty and cumulative coverage.
    
    Logic: the text is "comfortably readable" at a CEFR level if 90%+ of its vocabulary
    is at or below that level (after cognate adjustment).
    """
    for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
        if cumulative.get(level, 0) >= 90:
            return level
    # If nothing hits 90%, report the level where we cross 80%
    for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
        if cumulative.get(level, 0) >= 80:
            return level + "+"
    # Fallback to the adjusted score
    for level, threshold in [("A1", 1.5), ("A2", 2.5), ("B1", 3.5), ("B2", 4.5), ("C1", 5.5)]:
        if adjusted_score <= threshold:
            return level
    return "C2"


# ── CLI ────────────────────────────────────────────────────────────────

def profile_file(filepath):
    """Profile a single story file."""
    title = extract_story_title(filepath)
    body = extract_story_body(filepath)
    return profile_text(body, title)


def main():
    parser = argparse.ArgumentParser(
        description="Vocabulary profiler for Profe Kyle's story difficulty evaluator"
    )
    parser.add_argument("input", help="Path to a story markdown file, or a folder for batch mode")
    parser.add_argument("--batch", action="store_true", help="Process all .md files in the input folder")
    parser.add_argument("--text", action="store_true", help="Input is raw text instead of a file path")
    parser.add_argument("--output", "-o", help="Output file path (default: stdout)")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    args = parser.parse_args()
    
    indent = 2 if args.pretty else None
    
    if args.batch:
        # Batch mode: process all .md files in a folder
        folder = Path(args.input)
        if not folder.is_dir():
            print(f"Error: {folder} is not a directory", file=sys.stderr)
            sys.exit(1)
        
        results = []
        md_files = sorted(folder.glob("*.md"))
        for md_file in md_files:
            try:
                profile = profile_file(str(md_file))
                results.append(profile)
            except Exception as e:
                print(f"Error processing {md_file}: {e}", file=sys.stderr)
        
        output = {
            "total_stories": len(results),
            "profiles": results,
        }
        
    elif args.text:
        # Raw text mode
        profile = profile_text(args.input, "(inline text)")
        output = profile
        
    else:
        # Single file mode
        if not os.path.exists(args.input):
            print(f"Error: {args.input} not found", file=sys.stderr)
            sys.exit(1)
        profile = profile_file(args.input)
        output = profile
    
    json_output = json.dumps(output, ensure_ascii=False, indent=indent)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(json_output)
        print(f"Output saved to {args.output}", file=sys.stderr)
    else:
        print(json_output)


if __name__ == "__main__":
    main()