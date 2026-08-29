/**
 * Connected-speech heuristics for LatAm Spanish speakers learning en-US.
 *
 * These run AFTER individual-word coaching and add reason codes / coaching
 * related to linking, reduction, and rhythm - things Azure doesn't label
 * explicitly but that we can infer from word context and break signals.
 */

import type { WordEntry, WordCoaching } from './azurePronunciation'
import { matchCoachPairRule } from './coachRules'

// ── Types ──────────────────────────────────────────────────

type PairHeuristic = {
  code: string
  /** Return coaching if the word-pair pattern matches, or null to skip.
   *  `left` is words[i], `right` is words[i+1]. */
  match: (left: WordEntry, right: WordEntry) => WordCoaching | null
}

// ── Helpers ────────────────────────────────────────────────

const lo = (s: string) => s.toLowerCase()

const CONSONANT_ENDING = /[bcdfgklmnpqrstvwxz]$/i
const VOWEL_STARTING = /^[aeiou]/i

/** True if Azure flagged an unexpected break before `right` */
function hasUnexpectedBreak(right: WordEntry, threshold = 0.6): boolean {
  return (right.breakFeedback?.unexpectedBreakConfidence ?? 0) >= threshold
}

function hasPhoneme(word: WordEntry, pattern: RegExp): boolean {
  return word.phonemes.some((p) => pattern.test(p.phoneme))
}

function hasPhonemeAtLeast(word: WordEntry, pattern: RegExp, minAccuracy: number): boolean {
  return word.phonemes.some((p) => pattern.test(p.phoneme) && p.accuracy >= minAccuracy)
}

function endsWithLetter(word: WordEntry, letter: string): boolean {
  return lo(word.word).endsWith(letter)
}

function startsWithVowelLetter(word: WordEntry): boolean {
  return VOWEL_STARTING.test(word.word)
}

// ── Reduction patterns (bigrams) ───────────────────────────

type ReductionEntry = {
  left: string
  right: string
  code: string
  coaching: WordCoaching
}

const REDUCTIONS: ReductionEntry[] = [
  {
    left: 'want', right: 'to', code: 'reduction_want_to',
    coaching: {
      shortWhyEs: '"Want to" en inglés natural suena como "wanna". No se pronuncian las dos palabras por separado.',
      tipEs: 'Conecta las palabras: "wanna" en vez de "want - to". Deja que la T y la vocal se unan.',
      practiceEs: 'Practica: "I wanna go", "I wanna eat". Repite 5 veces rápido.',
    },
  },
  {
    left: 'going', right: 'to', code: 'reduction_going_to',
    coaching: {
      shortWhyEs: '"Going to" en inglés natural suena como "gonna". Es una reducción muy común.',
      tipEs: 'Conecta las palabras: "gonna" en vez de "going - to".',
      practiceEs: 'Practica: "I\'m gonna call her", "We\'re gonna be late". Repite 5 veces.',
    },
  },
  {
    left: 'got', right: 'to', code: 'reduction_got_to',
    coaching: {
      shortWhyEs: '"Got to" en inglés natural suena como "gotta".',
      tipEs: 'Conecta las palabras: "gotta" en vez de "got - to".',
      practiceEs: 'Practica: "I gotta go", "You gotta try". Repite 5 veces.',
    },
  },
  {
    left: 'have', right: 'to', code: 'reduction_have_to',
    coaching: {
      shortWhyEs: '"Have to" en inglés natural suena como "hafta". La V se convierte en F.',
      tipEs: 'Conecta: "hafta" en vez de "have - to". La V suena como F antes de T.',
      practiceEs: 'Practica: "I hafta work", "You hafta listen". Repite 5 veces.',
    },
  },
  {
    left: 'used', right: 'to', code: 'reduction_used_to',
    coaching: {
      shortWhyEs: '"Used to" en inglés natural suena como "yoosta". La D y la T se funden.',
      tipEs: 'Conecta: "yoosta" en vez de "used - to". La D desaparece antes de la T.',
      practiceEs: 'Practica: "I yoosta live there", "She yoosta work here". Repite 5 veces.',
    },
  },
  {
    left: 'has', right: 'to', code: 'reduction_has_to',
    coaching: {
      shortWhyEs: '"Has to" en inglés natural suena como "hasta". La S y la T se conectan.',
      tipEs: 'Conecta las palabras rápidamente. No hagas pausa entre "has" y "to".',
      practiceEs: 'Practica: "She hasta go", "He hasta work". Repite 5 veces.',
    },
  },
  {
    left: 'out', right: 'of', code: 'reduction_out_of',
    coaching: {
      shortWhyEs: '"Out of" en inglés natural suena como "outta". La T conecta con la vocal.',
      tipEs: 'Conecta: "outta" en vez de "out - of". La T se suaviza entre vocales.',
      practiceEs: 'Practica: "Get outta here", "Out of my way". Repite 5 veces.',
    },
  },
  {
    left: 'kind', right: 'of', code: 'reduction_kind_of',
    coaching: {
      shortWhyEs: '"Kind of" en inglés natural suena como "kinda".',
      tipEs: 'Conecta: "kinda" en vez de "kind - of". Es una reducción muy frecuente.',
      practiceEs: 'Practica: "I\'m kinda tired", "It\'s kinda cold". Repite 5 veces.',
    },
  },
]

// "Can you", "did you", "would you" - yod-coalescence
const YOU_PATTERNS: ReductionEntry[] = [
  {
    left: 'can', right: 'you', code: 'reduction_can_you',
    coaching: {
      shortWhyEs: '"Can you" en inglés natural suena como "kenyuh" o "canyuh". Las palabras se conectan.',
      tipEs: 'Conecta "can" con "you" sin pausa. La N y la Y se funden.',
      practiceEs: 'Practica: "Canyuh help me?", "Canyuh see it?". Repite 5 veces.',
    },
  },
  {
    left: 'did', right: 'you', code: 'reduction_did_you',
    coaching: {
      shortWhyEs: '"Did you" en inglés natural suena como "didyuh" o incluso "dijuh".',
      tipEs: 'Conecta "did" con "you" rápidamente. La D y la Y se funden.',
      practiceEs: 'Practica: "Dijuh see that?", "Dijuh eat?". Repite 5 veces.',
    },
  },
  {
    left: 'would', right: 'you', code: 'reduction_would_you',
    coaching: {
      shortWhyEs: '"Would you" en inglés natural suena como "wudjuh".',
      tipEs: 'Conecta "would" con "you" sin pausa. La D y la Y se mezclan.',
      practiceEs: 'Practica: "Wudjuh like some?", "Wudjuh help me?". Repite 5 veces.',
    },
  },
]

// ── Pair heuristics ────────────────────────────────────────

const PAIR_HEURISTICS: PairHeuristic[] = [
  // 1) Known reductions (from lookup tables)
  {
    code: '_reduction_lookup',
    match: (left, right) => {
      const l = lo(left.word)
      const r = lo(right.word)
      const all = [...REDUCTIONS, ...YOU_PATTERNS]
      const entry = all.find((e) => e.left === l && e.right === r)
      if (!entry) return null
      // Only surface if there's an unexpected break (over-segmenting)
      // OR if either word scored low
      if (left.accuracy >= 80 && right.accuracy >= 80 && !hasUnexpectedBreak(right, 0.5)) return null
      return entry.coaching
    },
  },

  // 2) Consonant→Vowel linking (generic)
  {
    code: 'linking_consonant_vowel',
    match: (left, right) => {
      if (!CONSONANT_ENDING.test(left.word)) return null
      if (!VOWEL_STARTING.test(right.word)) return null
      // Only trigger if there's an unexpected break OR both words are mediocre
      if (!hasUnexpectedBreak(right) && left.accuracy >= 75 && right.accuracy >= 75) return null
      return {
        shortWhyEs: `"${left.word} ${right.word}" deben conectarse. En inglés, la consonante final se une con la vocal siguiente.`,
        tipEs: `No hagas pausa entre "${left.word}" y "${right.word}". La última consonante de "${left.word}" inicia la siguiente palabra.`,
        practiceEs: `Practica: di "${left.word} ${right.word}" como si fueran una sola palabra. Repite 5 veces cada vez más rápido.`,
      }
    },
  },

  // 2a) Vowel→Vowel linking (glide) - e.g. "go out"
  {
    code: 'linking_vowel_vowel_glide',
    match: (left, right) => {
      const leftEndsWithVowel = /[aeiou]$/i.test(left.word)
      if (!leftEndsWithVowel) return null
      if (!startsWithVowelLetter(right)) return null

      // Only coach when Azure suggests they inserted a pause/break.
      if (!hasUnexpectedBreak(right, 0.5)) return null

      const l = lo(left.word)
      const r = lo(right.word)
      const isGoOut = l === 'go' && r === 'out'

      if (isGoOut) {
        return {
          shortWhyEs: `"${left.word} ${right.word}" se conecta en inglés. Entre vocales, suele aparecer un mini deslizamiento (suena como "gowout").`,
          tipEs: `No cortes la voz entre "${left.word}" y "${right.word}". Mantén el aire y desliza la boca: al final de "${left.word}" añade un toque tipo "w" y entra directo a "${right.word}".`,
          practiceEs: `Practica: "${left.word} ${right.word}" → "gowout" (x5). Luego: "I want to ${left.word} ${right.word} and get it."`,
        }
      }

      return {
        shortWhyEs: `"${left.word} ${right.word}" tiene vocal con vocal. En inglés, normalmente se conectan sin cortar la voz.`,
        tipEs: `Evita la pausa entre vocales. Mantén la voz y usa un deslizamiento suave (a veces se siente como una mini "y" o "w") para pasar de "${left.word}" a "${right.word}".`,
        practiceEs: `Practica: di "${left.word} ${right.word}" sin parar el aire (x5), luego en frase completa.`,
      }
    },
  },

  // 2b) Flap T/D between vowels across word boundary
  {
    code: 'flap_t_between_vowels',
    match: (left, right) => {
      // Only consider when next word starts with a vowel letter (it, and, out, etc.)
      if (!startsWithVowelLetter(right)) return null

      // We want cases like: out_and, get_it, put_it, at_all, etc.
      // Without a forced-aligner, we use spelling/phoneme hints + break feedback.
      const leftHasFinalTD =
        endsWithLetter(left, 't') ||
        endsWithLetter(left, 'd') ||
        hasPhoneme(left, /^(t|d)$/i)

      if (!leftHasFinalTD) return null

      // Guardrail: if Azure already shows a flap-like phoneme, don't nag.
      // Azure may emit ɾ (tap) in some locales/models.
      const alreadyFlapped = hasPhoneme(left, /^ɾ$/) || hasPhoneme(left, /^dx$/i)
      if (alreadyFlapped) return null

      // Only surface when we suspect they separated words or over-articulated.
      const unexpectedBreak = hasUnexpectedBreak(right, 0.5)
      const likelyStop = hasPhonemeAtLeast(left, /^(t|d)$/i, 80)

      // User preference: only coach when it looks like they *didn't* connect naturally.
      // Primary signal: unexpected break between words.
      // Secondary signal: decent-confidence T/D with not-perfect overall scores (avoid nagging).
      if (!unexpectedBreak) {
        if (!likelyStop) return null
        if (left.accuracy >= 88 && right.accuracy >= 88) return null
      }

      return {
        shortWhyEs: `Entre vocales, la T en "${left.word} ${right.word}" suele sonar como una D suave (como un golpecito rápido).`,
        tipEs:
          `No hagas una T fuerte. Haz un toque rápido con la lengua (suena como una "D suave" en inglés o como una "r" rápida). Conecta "${left.word}" con "${right.word}" sin pausa.`,
        practiceEs: `Practica en bloques: "${left.word} ${right.word}" (x5). Luego en frase completa, cada vez más natural.`,
      }
    },
  },

  // 3) "and" reduction in context
  {
    code: 'reduction_and',
    match: (_left, right) => {
      if (lo(right.word) !== 'and') return null
      if (right.accuracy >= 80) return null
      return {
        shortWhyEs: '"And" en inglés natural casi nunca se pronuncia completo. Suena como "n" o "en".',
        tipEs: 'Reduce "and" a solo "n" o "en". No digas "ænd" con todas las letras.',
        practiceEs: 'Practica: "bread n butter", "salt n pepper", "come n go". Repite 5 veces.',
      }
    },
  },
]

// ── Public API ─────────────────────────────────────────────

export type ConnectedSpeechIssue = {
  leftWord: string
  rightWord: string
  code: string
  coaching: WordCoaching
}

/**
 * Analyze word pairs for connected-speech patterns.
 * Returns a list of detected issues (does NOT mutate words).
 */
export function analyzeConnectedSpeech(words: WordEntry[]): ConnectedSpeechIssue[] {
  const issues: ConnectedSpeechIssue[] = []

  for (let i = 0; i < words.length - 1; i++) {
    const left = words[i]!
    const right = words[i + 1]!

    // 0) Coach-authored KB pair rules take precedence to avoid duplicates.
    const kbMatch = matchCoachPairRule(left, right)
    if (kbMatch) {
      issues.push({
        leftWord: left.word,
        rightWord: right.word,
        code: kbMatch.reasonCode,
        coaching: kbMatch.coaching,
      })
      continue
    }

    for (const heuristic of PAIR_HEURISTICS) {
      const coaching = heuristic.match(left, right)
      if (coaching) {
        // Determine the actual code (for reduction lookups, use the entry code)
        let code = heuristic.code
        if (code === '_reduction_lookup') {
          const l = lo(left.word)
          const r = lo(right.word)
          const all = [...REDUCTIONS, ...YOU_PATTERNS]
          const entry = all.find((e) => e.left === l && e.right === r)
          code = entry?.code ?? 'reduction_generic'
        }

        issues.push({
          leftWord: left.word,
          rightWord: right.word,
          code,
          coaching,
        })
        break // one issue per pair
      }
    }
  }

  return issues
}
