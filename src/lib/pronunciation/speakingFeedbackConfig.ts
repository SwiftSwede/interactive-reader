/** Thresholds for the Slice 93 speaking prototype. Do not import the scripted drill thresholds. */

export const PHONEME_ERROR_THRESHOLD = 60;
export const WORD_MANGLE_THRESHOLD = 40;
export const MAX_MANGLED_WORDS_SHOWN = 3;
export const PATTERN_MIN_INSTANCES = 3;
export const MAX_PATTERNS_SHOWN = 2;
export const MIN_AUDIO_SECONDS = 15;
export const NUDGE_SECONDS = 30;
export const MAX_AUDIO_SECONDS = 180;

export const SPEAKING_PROMPT_ID = "p1";

export const SPEAKING_PROMPT =
  "Think about a person who changed the way you see something: a teacher, a family member, someone you worked with. Who was it, and what did they change for you?";

export const SPEAKING_LEVEL = "int";

export const SPEAKING_DAILY_CAP = 3;

export const SPEAKING_TIME_ZONE = "America/Mexico_City";

export const MAX_SPEAKING_AUDIO_BYTES = 12 * 1024 * 1024;
