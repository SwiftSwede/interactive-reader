export type WordCoaching = {
  shortWhyEs: string;
  tipEs: string;
  practiceEs: string;
};

export type SpokenPhonemeGuess = {
  phoneme: string;
  score: number;
};

export type PhonemeEntry = {
  phoneme: string;
  accuracy: number;
  /** Azure's best guess of the sound the student actually produced. */
  spokenPhoneme?: string;
  nBestPhonemes?: SpokenPhonemeGuess[];
};

export type WordBreakFeedback = {
  unexpectedBreakConfidence: number;
  missingBreakConfidence: number;
};

export type PronunciationWord = {
  word: string;
  accuracy: number;
  errorType?: string;
  reasonCodes?: string[];
  coaching?: WordCoaching | null;
  phonemes?: PhonemeEntry[];
  breakFeedback?: WordBreakFeedback | null;
};

export type PronunciationTopIssue = {
  word: string;
  focusIpa: string;
  accuracy: number;
  errorType?: string;
  reasonCodes?: string[];
  shortWhyEs: string;
  tipEs: string;
  practiceEs: string;
  phonemes: PhonemeEntry[];
};

export type ConnectedSpeechIssue = {
  leftWord: string;
  rightWord: string;
  code: string;
  coaching: WordCoaching;
};

export type PronunciationAssessmentResponse = {
  referenceText: string;
  /** Word-level transcript of the student's audio (what Azure heard). */
  recognizedText?: string;
  overall: {
    accuracy: number;
    fluency: number;
    completeness: number;
    prosody?: number;
  };
  words: PronunciationWord[];
  topIssues: PronunciationTopIssue[];
  connectedSpeechIssues?: ConnectedSpeechIssue[];
};
