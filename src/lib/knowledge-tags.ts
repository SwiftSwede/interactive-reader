import type { TagType } from "@/types";

// ── Controlled tag vocabulary (Phase 4, slice 36) ──────────
//
// Stable `name` keys are the contract. Display names are Spanish-facing labels
// for the student dashboard, so they follow the Spanish-nav / English-content
// split: grammar and phonetic labels keep the English term the student already
// hears in class, with a short Spanish gloss where it helps.
//
// Nothing here is auto-generated. Adding a tag is a deliberate edit.

export type TagSeed = {
  name: string;
  displayName: string;
  /** Grammar only: stable names of tags a learner usually meets first. */
  prerequisites?: string[];
};

/**
 * Grammar tags. Every name maps from at least one label the difficulty
 * evaluator already produces in `rubric.dimensions.grammatical_complexity`.
 */
export const GRAMMAR_TAG_SEEDS: TagSeed[] = [
  { name: "present_simple", displayName: "Present Simple" },
  { name: "past_simple", displayName: "Past Simple" },
  { name: "present_continuous", displayName: "Present Continuous" },
  {
    name: "past_continuous",
    displayName: "Past Continuous",
    prerequisites: ["past_simple", "present_continuous"],
  },
  {
    name: "present_perfect",
    displayName: "Present Perfect",
    prerequisites: ["past_simple"],
  },
  {
    name: "present_perfect_continuous",
    displayName: "Present Perfect Continuous",
    prerequisites: ["present_perfect", "present_continuous"],
  },
  {
    name: "past_perfect",
    displayName: "Past Perfect",
    prerequisites: ["past_simple", "present_perfect"],
  },
  {
    name: "past_perfect_continuous",
    displayName: "Past Perfect Continuous",
    prerequisites: ["past_perfect"],
  },
  { name: "going_to_future", displayName: "Going To Future" },
  { name: "will_future", displayName: "Will Future" },
  { name: "modals_basic", displayName: "Modals" },
  {
    name: "modals_perfect",
    displayName: "Modal Perfect",
    prerequisites: ["modals_basic", "present_perfect"],
  },
  {
    name: "first_conditional",
    displayName: "First Conditional",
    prerequisites: ["present_simple", "will_future"],
  },
  {
    name: "second_conditional",
    displayName: "Second Conditional",
    prerequisites: ["past_simple", "first_conditional"],
  },
  {
    name: "third_conditional",
    displayName: "Third Conditional",
    prerequisites: ["past_perfect", "second_conditional"],
  },
  {
    name: "mixed_conditional",
    displayName: "Mixed Conditional",
    prerequisites: ["second_conditional", "third_conditional"],
  },
  {
    name: "wish_structures",
    displayName: "Wish Structures",
    prerequisites: ["second_conditional"],
  },
  {
    name: "reported_speech",
    displayName: "Reported Speech",
    prerequisites: ["past_simple"],
  },
  { name: "passive_voice", displayName: "Passive Voice" },
  { name: "relative_clauses", displayName: "Relative Clauses" },
  { name: "subordinate_clauses", displayName: "Subordinate Clauses" },
  {
    name: "participial_clauses",
    displayName: "Participial Clauses",
    prerequisites: ["relative_clauses"],
  },
  { name: "infinitive_clauses", displayName: "Infinitive Clauses" },
  { name: "gerunds", displayName: "Gerunds" },
  { name: "comparatives", displayName: "Comparatives" },
  { name: "imperatives", displayName: "Imperatives" },
  { name: "tag_questions", displayName: "Tag Questions" },
  { name: "indirect_questions", displayName: "Indirect Questions" },
  { name: "used_to", displayName: "Used To" },
  {
    name: "would_past_habit",
    displayName: "Would For Past Habit",
    prerequisites: ["used_to"],
  },
];

/** Topical vocabulary tags plus two lexical-type tags. */
export const VOCABULARY_TAG_SEEDS: TagSeed[] = [
  { name: "family", displayName: "Familia" },
  { name: "food", displayName: "Comida" },
  { name: "work", displayName: "Trabajo" },
  { name: "school", displayName: "Escuela" },
  { name: "travel", displayName: "Viajes" },
  { name: "transport", displayName: "Transporte" },
  { name: "health", displayName: "Salud" },
  { name: "money", displayName: "Dinero" },
  { name: "shopping", displayName: "Compras" },
  { name: "home", displayName: "Casa" },
  { name: "weather", displayName: "Clima" },
  { name: "sports", displayName: "Deportes" },
  { name: "relationships", displayName: "Relaciones" },
  { name: "technology", displayName: "Tecnología" },
  { name: "emotions", displayName: "Emociones" },
  { name: "city_life", displayName: "Vida en la ciudad" },
  { name: "clothing", displayName: "Ropa" },
  { name: "crime", displayName: "Crimen" },
  { name: "music", displayName: "Música" },
  { name: "holidays_christmas", displayName: "Navidad" },
  { name: "holidays_halloween", displayName: "Halloween" },
  { name: "holidays_thanksgiving", displayName: "Thanksgiving" },
  { name: "holidays_new_year", displayName: "Año Nuevo" },
  { name: "idiomatic_expressions", displayName: "Expresiones idiomáticas" },
  { name: "phrasal_verbs", displayName: "Phrasal Verbs" },
];

/**
 * Phonetic tags. Focused on what Kyle actually drills for Spanish speakers,
 * not one tag per phoneme. IPA follows Kyle's conventions (ɑ, not ɔ).
 */
export const PHONETIC_TAG_SEEDS: TagSeed[] = [
  { name: "ed_endings_voiceless", displayName: "-ed as /t/" },
  { name: "ed_endings_voiced", displayName: "-ed as /d/" },
  { name: "ed_endings_syllabic", displayName: "-ed as /ɪd/" },
  { name: "s_endings_voiceless", displayName: "-s as /s/" },
  { name: "s_endings_voiced", displayName: "-s as /z/" },
  { name: "s_endings_syllabic", displayName: "-s as /ɪz/" },
  { name: "emphasized_syllable", displayName: "Sílaba acentuada" },
  { name: "th_unvoiced", displayName: "TH sordo /θ/" },
  { name: "th_voiced", displayName: "TH sonoro /ð/" },
  { name: "schwa_reduction", displayName: "Schwa /ə/" },
  { name: "short_i_vs_long_e", displayName: "/ɪ/ vs /iː/" },
  { name: "listerine_vowel", displayName: "Vocal abierta /ɑ/" },
  { name: "short_u", displayName: "/ʌ/ corta" },
  { name: "short_a", displayName: "/æ/" },
  { name: "short_e", displayName: "/ɛ/" },
  { name: "oo_short", displayName: "/ʊ/" },
  { name: "r_colored_vowels", displayName: "Vocales con R /ɝ/" },
  { name: "american_r", displayName: "R americana /ɹ/" },
  { name: "v_vs_b", displayName: "V vs B" },
  { name: "z_sound", displayName: "/z/" },
  { name: "sh_sound", displayName: "/ʃ/" },
  { name: "zh_sound", displayName: "/ʒ/" },
  { name: "ch_sound", displayName: "/tʃ/" },
  { name: "j_sound", displayName: "/dʒ/" },
  { name: "y_sound", displayName: "/j/" },
  { name: "h_aspiration", displayName: "H aspirada /h/" },
  { name: "ng_ending", displayName: "/ŋ/ final" },
  { name: "s_consonant_clusters", displayName: "Grupos con S" },
  { name: "word_boundary_linking", displayName: "Unión de palabras" },
];

export const TAG_SEEDS: Record<TagType, TagSeed[]> = {
  grammar: GRAMMAR_TAG_SEEDS,
  vocabulary: VOCABULARY_TAG_SEEDS,
  phonetic: PHONETIC_TAG_SEEDS,
};

// ── Evaluator label mapping ────────────────────────────────
// The difficulty evaluator writes free-text tense labels such as
// "past perfect (she'd seen, she'd made)". Normalizing to stable tag names
// keeps the knowledge graph deterministic instead of LLM-guessed.

const GRAMMAR_LABEL_MAP: Record<string, string> = {
  "present simple": "present_simple",
  "simple present": "present_simple",
  "past simple": "past_simple",
  "simple past": "past_simple",
  "present continuous": "present_continuous",
  "present progressive": "present_continuous",
  "past continuous": "past_continuous",
  "past progressive": "past_continuous",
  "present perfect": "present_perfect",
  "present perfect continuous": "present_perfect_continuous",
  "present perfect progressive": "present_perfect_continuous",
  "past perfect": "past_perfect",
  "past perfect continuous": "past_perfect_continuous",
  "going to future": "going_to_future",
  "going to": "going_to_future",
  "future with going to": "going_to_future",
  "will future": "will_future",
  "future simple": "will_future",
  "simple future": "will_future",
  "future with will": "will_future",
  modals: "modals_basic",
  "basic modals": "modals_basic",
  "modal verbs": "modals_basic",
  "modal perfect": "modals_perfect",
  "modal perfects": "modals_perfect",
  "first conditional": "first_conditional",
  "1st conditional": "first_conditional",
  "second conditional": "second_conditional",
  "2nd conditional": "second_conditional",
  "third conditional": "third_conditional",
  "3rd conditional": "third_conditional",
  "mixed conditional": "mixed_conditional",
  "mixed conditionals": "mixed_conditional",
  conditional: "first_conditional",
  conditionals: "first_conditional",
  "wish structure": "wish_structures",
  "wish structures": "wish_structures",
  wish: "wish_structures",
  "wish clauses": "wish_structures",
  "reported speech": "reported_speech",
  "basic reported speech": "reported_speech",
  "indirect speech": "reported_speech",
  "reported/indirect speech": "reported_speech",
  "reported speech elements": "reported_speech",
  "reported speech with backshifting": "reported_speech",
  "passive voice": "passive_voice",
  passive: "passive_voice",
  "basic passive": "passive_voice",
  passives: "passive_voice",
  "relative clauses": "relative_clauses",
  "basic relative clauses": "relative_clauses",
  "subordinate clauses": "subordinate_clauses",
  "participial clauses": "participial_clauses",
  "infinitive clauses": "infinitive_clauses",
  "infinitive of purpose": "infinitive_clauses",
  gerunds: "gerunds",
  gerund: "gerunds",
  comparatives: "comparatives",
  "comparatives and superlatives": "comparatives",
  imperatives: "imperatives",
  "tag questions": "tag_questions",
  "indirect questions": "indirect_questions",
  "used to": "used_to",
  "would for past habit": "would_past_habit",
  "would for habitual past": "would_past_habit",
};

/**
 * Normalizes one evaluator tense label to a grammar tag name.
 * Returns null when the label is not in the controlled vocabulary, so unknown
 * labels surface for review instead of silently inventing a tag.
 */
export function grammarTagFromLabel(rawLabel: string): string | null {
  // Drop parenthetical examples: "past perfect (she'd seen)" -> "past perfect"
  const base = rawLabel
    .split("(")[0]
    .trim()
    .toLowerCase()
    .replace(/[.;,]+$/, "")
    .replace(/\s+/g, " ");

  if (!base) return null;
  return GRAMMAR_LABEL_MAP[base] ?? null;
}

// ── IPA symbol to phonetic tag ─────────────────────────────
// Used to propose phonetic tags from a story's Práctica Coral IPA.

const IPA_TAG_MAP: Record<string, string> = {
  θ: "th_unvoiced",
  ð: "th_voiced",
  ə: "schwa_reduction",
  ɪ: "short_i_vs_long_e",
  iː: "short_i_vs_long_e",
  ɑ: "listerine_vowel",
  ʌ: "short_u",
  æ: "short_a",
  ɛ: "short_e",
  ʊ: "oo_short",
  ɝ: "r_colored_vowels",
  ɹ: "american_r",
  v: "v_vs_b",
  z: "z_sound",
  ʃ: "sh_sound",
  ʒ: "zh_sound",
  "tʃ": "ch_sound",
  "dʒ": "j_sound",
  j: "y_sound",
  h: "h_aspiration",
  ŋ: "ng_ending",
};

/** Two-character IPA sequences must be tested before single characters. */
const MULTI_CHAR_IPA = ["tʃ", "dʒ", "iː"];

/**
 * Phonetic tag names present in an IPA string.
 * Ignores every symbol that is not a curated teaching target.
 */
export function phoneticTagsFromIpa(ipa: string): string[] {
  if (!ipa) return [];

  const found = new Set<string>();
  let rest = ipa;

  for (const seq of MULTI_CHAR_IPA) {
    if (rest.includes(seq)) {
      found.add(IPA_TAG_MAP[seq]);
      rest = rest.split(seq).join(" ");
    }
  }

  for (const char of rest) {
    const tag = IPA_TAG_MAP[char];
    if (tag) found.add(tag);
  }

  return [...found].sort();
}

/** Drill focus type to the phonetic tags that focus always implies. */
export function phoneticTagsFromFocusType(focusType: string): string[] {
  switch (focusType) {
    case "ed-s-rules":
      return [
        "ed_endings_voiceless",
        "ed_endings_voiced",
        "ed_endings_syllabic",
        "s_endings_voiceless",
        "s_endings_voiced",
        "s_endings_syllabic",
      ];
    case "emphasized-syllable":
      return ["emphasized_syllable"];
    default:
      return [];
  }
}

// ── Vocabulary topic keywords ──────────────────────────────
// Deliberately conservative: a topic is proposed only when the story uses its
// words repeatedly, so review stays short.

export const VOCABULARY_KEYWORDS: Record<string, string[]> = {
  family: ["mother", "father", "mom", "dad", "brother", "sister", "grandma", "grandpa", "aunt", "uncle", "cousin", "parents"],
  food: ["food", "eat", "dinner", "lunch", "breakfast", "cook", "recipe", "kitchen", "meal", "restaurant", "taste"],
  work: ["work", "job", "boss", "office", "meeting", "coworker", "salary", "interview", "career", "employee"],
  school: ["school", "teacher", "student", "class", "homework", "exam", "study", "university"],
  travel: ["travel", "trip", "flight", "airport", "hotel", "vacation", "suitcase", "passport", "tourist"],
  transport: ["bus", "train", "subway", "taxi", "drive", "car", "traffic", "station", "ticket"],
  health: ["doctor", "hospital", "sick", "pain", "medicine", "nurse", "surgery", "diagnosis", "symptoms"],
  money: ["money", "pay", "cost", "price", "cheap", "expensive", "rent", "bill", "afford", "budget"],
  shopping: ["store", "shop", "buy", "mall", "sale", "customer", "cashier", "purchase"],
  home: ["house", "apartment", "room", "kitchen", "door", "neighbor", "furniture", "landlord"],
  weather: ["weather", "rain", "snow", "cold", "hot", "storm", "wind", "sunny", "temperature"],
  sports: ["soccer", "game", "team", "player", "match", "hockey", "coach", "goal", "score", "jersey"],
  relationships: ["girlfriend", "boyfriend", "wife", "husband", "date", "marriage", "love", "divorce", "couple"],
  technology: ["phone", "computer", "internet", "app", "online", "screen", "message", "email"],
  emotions: ["angry", "sad", "happy", "afraid", "nervous", "excited", "worried", "embarrassed"],
  city_life: ["city", "street", "downtown", "building", "sidewalk", "neighborhood", "apartment"],
  clothing: ["shirt", "pants", "shoes", "dress", "jacket", "clothes", "wear", "jersey", "costume"],
  crime: ["police", "steal", "thief", "robbery", "arrest", "jail", "kidnap", "murder"],
  music: ["music", "song", "band", "concert", "sing", "guitar", "album", "lyrics"],
  holidays_christmas: ["christmas", "santa", "gift", "presents", "tree", "eve"],
  holidays_halloween: ["halloween", "costume", "candy", "trick", "treat", "pumpkin", "scary"],
  holidays_thanksgiving: ["thanksgiving", "turkey", "pie", "gravy", "stuffing"],
  holidays_new_year: ["new year", "resolution", "midnight", "fireworks", "countdown"],
};

/** Minimum keyword hits before a topic is proposed for review. */
export const VOCABULARY_KEYWORD_THRESHOLD = 4;

/**
 * Vocabulary topic tags a story's text supports, with the hit count that put
 * them there so a reviewer can see why.
 */
export function proposeVocabularyTags(
  bodyText: string,
  threshold = VOCABULARY_KEYWORD_THRESHOLD
): Array<{ name: string; hits: number }> {
  const text = bodyText.toLowerCase();
  const proposals: Array<{ name: string; hits: number }> = [];

  for (const [name, keywords] of Object.entries(VOCABULARY_KEYWORDS)) {
    let hits = 0;
    for (const keyword of keywords) {
      // Word boundaries keep "eat" out of "great" and "car" out of "carefully".
      const pattern = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es|ed|ing)?\\b`,
        "g"
      );
      hits += (text.match(pattern) ?? []).length;
    }
    if (hits >= threshold) {
      proposals.push({ name, hits });
    }
  }

  return proposals.sort((a, b) => b.hits - a.hits);
}
