// Core data types for the Interactive Reader App
// Based on PRD Section 4: Data Structure
// These types define the shape of every entity in the system.

// ── Story ──────────────────────────────────────────────────

export type StoryLevel = "beginner" | "pre-intermediate" | "intermediate";

export interface Story {
  id: string;
  title: string;
  slug: string;
  level: StoryLevel;
  cefr: string; // e.g. "A2/B1"
  bodyText: string; // plain text of the story
  bodyHtml: string; // story with word spans, generated from annotation
  wordCount: number;
  isFree: boolean; // true for the one free demo story
  createdAt: string;
  updatedAt: string;
}

// ── Word ───────────────────────────────────────────────────

export interface Word {
  id: string;
  storyId: string;
  position: number; // word order within the story
  text: string; // the English word as it appears
  lemma: string; // base form, e.g. "went" → "go"
  spanishTranslation: string; // best translation in context
  phoneticTranscription: string; // Kyle's system: ö, ü, ä, ör, ë, etc.
  partOfSpeech: string;
  audioUrl: string; // path to MP3, /audio/words/[id].mp3
  expressionId: string | null; // if part of a multi-word expression
  isTransparent: boolean; // word doesn't need translation (cognates, etc.)
}

// ── Expression (multi-word units) ──────────────────────────

export interface Expression {
  id: string;
  storyId: string;
  text: string; // full expression, e.g. "pull the wool over my eyes"
  spanishTranslation: string;
  explanation: string; // what it means, why it's used
  wordIds: string[]; // ordered list of Word IDs that form this expression
}

// ── Story Audio ─────────────────────────────────────────────

export interface StoryAudio {
  id: string;
  storyId: string;
  audioUrl: string; // path to full-story MP3
  voice: "kyle" | "edge-tts" | "openai-tts";
  durationSeconds: number;
}

// ── Comprehension Questions ────────────────────────────────

export type QuestionLevel = "factual" | "inferential";

export interface ComprehensionQuestion {
  id: string;
  storyId: string;
  position: number; // question order
  question: string;
  answer: string | null; // included for pre-int self-study; null for intermediate
  level: QuestionLevel;
}

// ── Personal Questions ─────────────────────────────────────

export interface PersonalQuestion {
  id: string;
  storyId: string;
  position: number;
  question: string;
}

// ── Pronunciation Drill ────────────────────────────────────

export type DrillFocusType = "sounds" | "ed-s-rules" | "emphasized-syllable";

export interface PronunciationDrill {
  id: string;
  storyId: string;
  symbolLegend: string | null; // the ö/ü/ä block, or null if using a different focus
  focusType: DrillFocusType;
  focusContent: string; // the specific drill content for this story
  practicaCoralStandard: string; // sentence in standard spelling
  practicaCoralPhonetic: string; // same sentence, phonetically respelled
}

// ── Sound Video (pronunciation teaching videos) ───────────

export interface SoundVideo {
  symbol: string; // Kyle's phonetic symbol: "ör", "ö", "ü", etc.
  name: string; // "Dog RRRRRRR", "Short U", "Angry Monkey"
  bunnyVideoId: string; // Bunny Stream video ID
  durationSeconds: number; // 120-240 range
  description: string; // short explanation of the sound
  examples: string[]; // example words: "fur", "learn", "sir"
  course: string; // which pronunciation course this video is from
}

// ── User (Phase 2) ─────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  purchased: boolean; // has paid $47
  purchasedAt: string | null;
  createdAt: string;
}

// ── SRS Card (Phase 2) ─────────────────────────────────────

export interface SRSCard {
  id: string;
  userId: string;
  wordId: string;
  interval: number; // days until next review
  easeFactor: number; // SM-2 ease, starts at 2.5
  repetitions: number; // successful reviews
  nextReviewDate: string; // ISO date string
  lastReviewedAt: string | null;
  createdAt: string;
}

// ── User Progress (Phase 2) ────────────────────────────────

export type ProgressStatus = "not-started" | "in-progress" | "completed";

export interface UserProgress {
  id: string;
  userId: string;
  storyId: string;
  status: ProgressStatus;
  comprehensionScore: number | null; // % correct
  startedAt: string | null;
  completedAt: string | null;
}

// ── User Highlight (Phase 2) ───────────────────────────────

export interface UserHighlight {
  id: string;
  userId: string;
  storyId: string;
  wordStart: number; // character position
  wordEnd: number; // character position
  color: string; // highlight color
  note: string | null; // user's personal note
  createdAt: string;
}