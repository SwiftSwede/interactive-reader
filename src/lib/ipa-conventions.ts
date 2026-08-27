/**
 * Kyle's IPA conventions for the interactive reader.
 * Used in annotation prompts and agent rules. Student-facing IPA only.
 */

export const KYLE_IPA_CONVENTIONS = `
Kyle's dialect (use for all new phonetic transcriptions):
- Use ɑ for the open back vowel in want, not, lot, walk, thought, off, and similar words.
- Do NOT use ɔ for that vowel. Kyle does not distinguish ɑ vs ɔ; one sound, written ɑ.
- R-colored OR in more, wore, four stays ɔɹ (symbol "or" in the sound catalog). That is separate from plain ɑ.
- Use standard American English IPA otherwise. Contractions as single tokens. Schwa ə for reduced vowels.
`.trim();

/** One-line hint for compact prompts */
export const KYLE_IPA_ALPHA_RULE =
  "Use ɑ (not ɔ) for the open vowel in want/walk/thought-type words; Kyle's dialect merges them.";
