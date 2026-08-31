// Core data types for the Interactive Reader App
// Based on PRD Section 4: Data Structure
// These types define the shape of every entity in the system.

// ── Story ──────────────────────────────────────────────────

export type StoryLevel = "beginner" | "pre-intermediate" | "intermediate";

// Dialogues and Movie Talks share the reader schema. Kind drives display only:
// ContentTag.content_type stays "story" for all of them.
export type StoryKind = "story" | "dialogue" | "movie_talk";

export interface Story {
  id: string;
  title: string;
  slug: string;
  level: StoryLevel;
  kind: StoryKind;
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

// ── Knowledge graph (Phase 4, slice 36) ────────────────────
// Tags describe language, not stories. The junction is polymorphic so a
// writing prompt or an exam can carry the same tag as a story.

export type TagType = "grammar" | "vocabulary" | "phonetic";

/** The catalog item that carries a tag. Phase 4 only writes "story". */
export type ContentType = "story" | "writing_prompt" | "exam_prompt";

export type CoverageLevel = "introduced" | "reinforced" | "mastered";

export interface LanguageTag {
  id: string;
  tagType: TagType;
  name: string; // stable key, e.g. "present_perfect"
  displayName: string; // e.g. "Present Perfect"
  prerequisites: string[]; // grammar only; other tag types are empty
}

export interface ContentTag {
  id: string;
  contentType: ContentType;
  contentId: string; // no FK: resolved per contentType by the app layer
  tagType: TagType;
  tagId: string;
  coverageLevel: CoverageLevel;
}

/** What the recommender returns. Never a bare storyId. */
export interface ContentRef {
  contentType: ContentType;
  contentId: string;
}

// ── Topic evidence (Phase 4, slice 37) ─────────────────────

export type EvidenceStatus = "seen" | "practiced" | "needs_more_practice";

/**
 * The activity that produced a signal. A different axis from ContentType:
 * content_type is the catalog item, source_type is what the learner did.
 * Passive exposure is "reading"; tapping a word is "word_lookup".
 */
export type EvidenceSourceType =
  | "reading"
  | "word_lookup"
  | "comprehension"
  | "personal_response"
  | "dictation"
  | "pronunciation"
  | "writing"
  | "exam";

export interface UserTopicEvidence {
  id: string;
  userId: string;
  tagType: TagType;
  tagId: string;
  status: EvidenceStatus;
  sourceType: EvidenceSourceType;
  sourceId: string | null;
  evidenceDetail: Record<string, unknown>;
  updatedAt: string;
}

// ── Practice attempts (Phase 4, slice 37) ──────────────────
// Dictation reuses the story's Práctica Coral sentence, so an attempt points
// at the pronunciation drill rather than a separate prompt catalog.

export interface DictationAttempt {
  id: string;
  userId: string;
  storyId: string;
  pronunciationDrillId: string | null;
  responseText: string;
  accuracy: number | null; // share of words matched, practice guidance only
  errorAnalysis: Record<string, unknown> | null;
  submittedAt: string;
}

/**
 * Azure output kept as practice guidance. Never an official score, never CEFR.
 */
export interface PronunciationAttempt {
  id: string;
  userId: string;
  storyId: string | null;
  pronunciationDrillId: string | null;
  referenceText: string;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  weakSounds: string[]; // IPA symbols that came back low
  createdAt: string;
}

export interface PersonalResponseRecord {
  id: string;
  userId: string;
  personalQuestionId: string;
  courseSessionId: string | null;
  responseText: string;
  attemptNumber: number;
  feedbackJson: Record<string, unknown> | null;
  submittedAt: string;
}