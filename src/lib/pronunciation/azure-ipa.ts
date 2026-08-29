/**
 * Normalize Azure phonemes (IPA or SAPI/ARPAbet) to the IPA keys
 * used by SoundVideo / IpaText.
 *
 * Kyle's dialect: ɑ not ɔ for want/walk/thought. R-colored OR stays ɔɹ.
 */

const AZURE_TO_IPA: Record<string, string> = {
  // SAPI / ARPAbet
  iy: "iː",
  ih: "ɪ",
  eh: "ɛ",
  ey: "eɪ",
  ae: "æ",
  aa: "ɑ",
  ao: "ɑ",
  ah: "ʌ",
  ax: "ə",
  uh: "ʊ",
  uw: "uː",
  ow: "oʊ",
  ay: "aɪ",
  aw: "aʊ",
  oy: "ɔɪ",
  er: "ɝ",
  axr: "ɚ",
  y: "j",
  yuw: "juː",
  th: "θ",
  dh: "ð",
  sh: "ʃ",
  zh: "ʒ",
  ch: "tʃ",
  jh: "dʒ",
  ng: "ŋ",
  hh: "h",
  dx: "t",
  el: "ɫ",
  em: "m",
  en: "n",

  // IPA variants Azure may emit
  i: "iː",
  "i:": "iː",
  "u:": "uː",
  u: "uː",
  ɔ: "ɑ",
  "ɔː": "ɑ",
  "ɑː": "ɑ",
  ɒ: "ɑ",
  ɚ: "ɝ",
  ər: "ɝ",
  "ɜr": "ɝ",
  "ɜː": "ɝ",
  r: "ɹ",
  ɻ: "ɹ",
  ɡ: "g",
  "əʊ": "oʊ",
  e: "eɪ",
  ju: "juː",
  ɑr: "ɑɹ",
  ɔr: "ɔɹ",
  ɛr: "ɛɹ",
  eɹ: "ɛɹ",
  ɪr: "ɪɹ",
  ɪə: "ɪɹ",
  ʊr: "ʊɹ",
  l̩: "ɫ",
};

export function azurePhonemeToIpa(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const mapped = AZURE_TO_IPA[trimmed] ?? AZURE_TO_IPA[trimmed.toLowerCase()];
  if (mapped) return mapped;
  if (trimmed.endsWith(":") && trimmed.length > 1) {
    return `${trimmed.slice(0, -1)}ː`;
  }
  return trimmed;
}

export function mapAssessmentPhonemes<
  T extends {
    phoneme: string;
    spokenPhoneme?: string;
    nBestPhonemes?: { phoneme: string; score: number }[];
  },
>(phonemes: T[]): T[] {
  return phonemes.map((entry) => {
    const nBestPhonemes = entry.nBestPhonemes?.map((guess) => ({
      ...guess,
      phoneme: azurePhonemeToIpa(guess.phoneme),
    }));
    const spokenPhoneme = entry.spokenPhoneme
      ? azurePhonemeToIpa(entry.spokenPhoneme)
      : nBestPhonemes?.[0]?.phoneme;
    return {
      ...entry,
      phoneme: azurePhonemeToIpa(entry.phoneme),
      spokenPhoneme,
      nBestPhonemes,
    };
  });
}
