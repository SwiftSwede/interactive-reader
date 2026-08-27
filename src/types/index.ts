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
  phoneticTranscription: string; // IPA, e.g. "/ðə/"
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

export interface PronunciationWordNote {
  word: string;
  note: string;
}

export interface PronunciationDrill {
  id: string;
  storyId: string;
  symbolLegend: string | null; // the ö/ü/ä block, or null if using a different focus
  focusType: DrillFocusType;
  focusContent: string; // the specific drill content for this story
  practicaCoralStandard: string; // sentence in standard spelling
  practicaCoralPhonetic: string; // Kyle's respelling, for source files
  practicaCoralIpa: string; // student-facing IPA
  wordNotes: PronunciationWordNote[];
  coralAudioUrl: string;
}

// ── Sound Video (pronunciation teaching videos) ───────────

export interface SoundVideo {
  symbol: string; // Kyle's nickname for teaching materials: "ör", "ö", "ü"
  ipa: string; // app lookup key, e.g. "ɝ"
  ipaAliases: string[]; // extra IPA forms that open the same video
  name: string; // "Dog RRRRRRR", "Short U", "Angry Monkey"
  bunnyVideoId: string; // Bunny Stream video ID; empty until uploaded
  durationSeconds: number; // 120-240 range
  description: string; // short explanation of the sound
  examples: string[]; // example words: "fur", "learn", "sir"
  course: string; // which pronunciation course this video is from
}

export interface ChoralPracticeCompletion {
  id: string;
  userId: string;
  storyId: string;
  roundsCompleted: number;
  completedAt: string;
}

// ── Profile (PRD User entity) ──────────────────────────────

export type UserRole = "student-classroom" | "student-consumer" | "teacher";
export type SubscriptionStatus = "active" | "cancelled" | "paused" | "none";
export type CourseLevel = "pre-intermediate" | "intermediate";
export type SessionType = "story" | "writing";
export type WritingSubmissionStatus = "draft" | "submitted" | "corrected";

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  stripeCustomerId: string | null;
  subscriptionStatus: SubscriptionStatus;
  purchased: boolean;
  purchasedAt: string | null;
  classroomLevel: CourseLevel | null;
  createdAt: string;
}

export interface SubscriptionPeriod {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  startedAt: string;
  endedAt: string | null;
  status: "active" | "cancelled" | "paused";
}

export interface Course {
  id: string;
  name: string;
  level: CourseLevel;
  teacherId: string;
  createdAt: string;
  archived: boolean;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  displayName: string;
}

export interface CourseSession {
  id: string;
  courseId: string;
  sessionType: SessionType;
  storyId: string | null;
  writingPromptId: string | null;
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  answersRevealed: boolean;
  notes: string | null;
  sessionLinkToken: string;
  timerStartedAt: string | null;
  createdAt: string;
}

export interface WritingPrompt {
  id: string;
  title: string;
  promptText: string;
  writingTimeMinutes: number;
  level: CourseLevel;
  structureLesson: string | null;
  rubricText: string | null;
  exampleParagraph: string | null;
  createdBy: string;
  createdAt: string;
}

export interface WritingSubmission {
  id: string;
  writingPromptId: string;
  userId: string;
  courseSessionId: string | null;
  submissionText: string;
  startedAt: string | null;
  submittedAt: string | null;
  elapsedSeconds: number | null;
  wordCount: number;
  wpm: number | null;
  status: WritingSubmissionStatus;
  createdAt: string;
}

export interface WritingCorrection {
  id: string;
  writingSubmissionId: string;
  correctedText: string;
  correctionDiff: Array<{ text: string; type: "kept" | "added" | "deleted" }>;
  inlineNotes: Array<{ word_index: number; note: string }> | null;
  goodVocabulary: number[] | null;
  correctedBy: string;
  correctedAt: string;
}

export interface SessionAttendance {
  id: string;
  courseSessionId: string;
  studentId: string;
  attended: boolean;
  firstOpenedAt: string;
}

export interface ComprehensionResponse {
  id: string;
  userId: string;
  comprehensionQuestionId: string;
  courseSessionId: string | null;
  responseText: string;
  revealedAnswer: boolean;
  revealedAt: string | null;
  submittedAt: string;
}

export interface WordLookup {
  id: string;
  userId: string;
  wordId: string;
  storyId: string;
  courseSessionId: string | null;
  lookedUpAt: string;
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