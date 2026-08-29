/**
 * Rule-based coaching for Latin-American Spanish speakers learning
 * American English (en-US) pronunciation.
 *
 * Each rule inspects a word's spelling + phoneme list + errorType and
 * optionally attaches reason codes + Spanish-language coaching.
 *
 * After rules run, the coaching knowledge base (JSON) can override
 * any rule's default coaching text via reasonCode.
 */

import type { WordEntry, WordCoaching } from './azurePronunciation'
import { getOverride } from './coachingTips'
import { matchCoachWordRule } from './coachRules'

// ── Types ──────────────────────────────────────────────────

type RuleMatch = {
  code: string
  coaching: WordCoaching
}

type Rule = {
  /** Unique reason code */
  code: string
  /** Return default coaching if the rule matches, or null to skip */
  match: (word: WordEntry) => WordCoaching | null
}

// ── Utility helpers ────────────────────────────────────────

const lo = (s: string) => s.toLowerCase()

/** Check if any phoneme in the word has accuracy below threshold */
function hasWeakPhoneme(word: WordEntry, phonemePattern: RegExp, maxAccuracy = 70): boolean {
  return word.phonemes.some(
    (p) => phonemePattern.test(p.phoneme) && p.accuracy < maxAccuracy,
  )
}

/** Check if the word spelling matches a pattern (case-insensitive) */
function spellMatch(word: WordEntry, pattern: RegExp): boolean {
  return pattern.test(lo(word.word))
}

// ── Rules (ordered by impact for LatAm Spanish speakers) ───

const RULES: Rule[] = [
  // ─── Omission ───────────────────────────────────────────
  {
    code: 'omission',
    match: (w) => {
      if (w.errorType !== 'Omission') return null
      return {
        shortWhyEs: `No se detectó la palabra "${w.word}". Puede que la hayas omitido o que no se escuchara claramente.`,
        tipEs: `Asegúrate de decir cada palabra de la oración. Lee más despacio y pronuncia "${w.word}" con claridad.`,
        practiceEs: `Repite la oración completa, enfocándote en decir "${w.word}" de forma clara.`,
      }
    },
  },

  // ─── Insertion ──────────────────────────────────────────
  {
    code: 'insertion',
    match: (w) => {
      if (w.errorType !== 'Insertion') return null
      return {
        shortWhyEs: `Se detectó la palabra "${w.word}" pero no está en la oración original.`,
        tipEs: `Intenta seguir el texto exacto. Lee la oración de nuevo sin agregar palabras extra.`,
        practiceEs: `Lee la oración despacio, palabra por palabra, siguiendo el texto.`,
      }
    },
  },

  // ─── TH sounds (θ / ð) ─────────────────────────────────
  {
    code: 'th_sound',
    match: (w) => {
      if (!spellMatch(w, /th/)) return null
      const weakTh = hasWeakPhoneme(w, /^[θð]$/, 75)
      if (!weakTh && w.accuracy >= 70) return null
      return {
        shortWhyEs: `En "${w.word}", el sonido TH puede sonar como T, D o S. En español no existe este sonido.`,
        tipEs: `Pon la punta de la lengua entre los dientes y sopla aire suavemente. No toques el paladar.`,
        practiceEs: `Practica: "think" vs "tink", "the" vs "de". Repite 5 veces exagerando la lengua entre los dientes.`,
      }
    },
  },

  // ─── American R (ɹ) ────────────────────────────────────
  {
    code: 'r_sound',
    match: (w) => {
      if (!spellMatch(w, /r/)) return null
      const weakR = hasWeakPhoneme(w, /^[ɹɻɚɝ]$/, 75)
      if (!weakR && w.accuracy >= 70) return null
      return {
        shortWhyEs: `La R en "${w.word}" suena diferente a la R del español. La R americana no vibra.`,
        tipEs: `Curva la lengua hacia atrás sin tocar el paladar. Los labios se redondean un poco. No hagas vibrar la lengua.`,
        practiceEs: `Practica: "red" (no "rred"), "very" (no "berry"). Repite despacio 5 veces.`,
      }
    },
  },

  // ─── V vs B ─────────────────────────────────────────────
  {
    code: 'v_b',
    match: (w) => {
      if (!spellMatch(w, /v/)) return null
      const weakV = hasWeakPhoneme(w, /^v$/, 75)
      if (!weakV && w.accuracy >= 70) return null
      return {
        shortWhyEs: `En "${w.word}", la V debe sonar diferente a la B. En español muchas veces suenan igual.`,
        tipEs: `Para la V, muerde suavemente tu labio inferior con los dientes de arriba y sopla. Para la B, los dos labios se tocan.`,
        practiceEs: `Practica: "very" vs "berry", "van" vs "ban". Siente la diferencia en el labio.`,
      }
    },
  },

  // ─── Short I (ɪ) vs long I (iː) — "ship" vs "sheep" ──
  {
    code: 'vowel_i',
    match: (w) => {
      const weakShortI = hasWeakPhoneme(w, /^ɪ$/, 70)
      if (!weakShortI) return null
      if (!spellMatch(w, /[iey]/)) return null
      return {
        shortWhyEs: `En "${w.word}", la vocal corta /ɪ/ (como en "ship") puede sonar como la /i/ larga (como en "sheep").`,
        tipEs: `La /ɪ/ corta es más relajada y breve. No estires los labios tanto. Piensa en un sonido entre "i" y "e".`,
        practiceEs: `Practica: "ship" vs "sheep", "sit" vs "seat". La corta es más rápida y relajada.`,
      }
    },
  },

  // ─── /æ/ as in "cat" ───────────────────────────────────
  {
    code: 'vowel_ae',
    match: (w) => {
      const weakAe = hasWeakPhoneme(w, /^æ$/, 70)
      if (!weakAe) return null
      return {
        shortWhyEs: `En "${w.word}", la vocal /æ/ (como en "cat") no existe en español. Puede sonar como "e" o "a".`,
        tipEs: `Abre la boca más de lo normal y baja la mandíbula. Es un sonido entre la "a" y la "e" del español.`,
        practiceEs: `Practica: "cat" vs "cut", "bad" vs "bed". Exagera la apertura de la boca.`,
      }
    },
  },

  // ─── /ʌ/ as in "cup" ──────────────────────────────────
  {
    code: 'vowel_uh',
    match: (w) => {
      const weakUh = hasWeakPhoneme(w, /^ʌ$/, 70)
      if (!weakUh) return null
      return {
        shortWhyEs: `En "${w.word}", la vocal /ʌ/ (como en "cup") puede confundirse con la "a" o la "o" del español.`,
        tipEs: `Relaja la boca en posición neutral (ni abierta ni cerrada). Es un sonido corto y central.`,
        practiceEs: `Practica: "cup" vs "cop", "cut" vs "cat". El sonido /ʌ/ es corto y relajado.`,
      }
    },
  },

  // ─── Schwa (ə) — reduced vowels ───────────────────────
  {
    code: 'schwa_reduction',
    match: (w) => {
      const weakSchwa = hasWeakPhoneme(w, /^ə$/, 65)
      if (!weakSchwa) return null
      if (!spellMatch(w, /^(a|an|the|to|of|for|and|or|but|was|were|can|could|would|should|from|at|in|on)$/)) return null
      return {
        shortWhyEs: `La palabra "${w.word}" tiene una vocal reducida (schwa). En inglés natural, estas palabras se dicen rápido y suave.`,
        tipEs: `No pronuncies cada vocal con fuerza. Las palabras pequeñas como "${w.word}" se reducen en el habla natural.`,
        practiceEs: `Practica decir "I want to go" como "I wanna go" — la "to" casi desaparece. Haz lo mismo con "${w.word}".`,
      }
    },
  },

  // ─── Final consonant clusters / release ────────────────
  {
    code: 'final_consonant',
    match: (w) => {
      if (!spellMatch(w, /(ed|[tdkgszpb])$/)) return null
      if (w.accuracy >= 70) return null
      const lastPhonemes = w.phonemes.slice(-2)
      const anyWeak = lastPhonemes.some((p) => p.accuracy < 65)
      if (!anyWeak && w.accuracy >= 60) return null
      return {
        shortWhyEs: `En "${w.word}", el sonido final puede haberse perdido. En español no es común terminar palabras con estos sonidos.`,
        tipEs: `Exagera la consonante final. Si termina en "-ed", decide si suena /t/, /d/ o /ɪd/. Suelta el aire al final.`,
        practiceEs: `Practica: di "${w.word}" y mantén el sonido final un poco más largo de lo normal.`,
      }
    },
  },

  // ─── Initial consonant clusters (s + consonant) ────────
  {
    code: 'initial_cluster',
    match: (w) => {
      if (!spellMatch(w, /^s[ptckbdgfmnlr]/)) return null
      if (w.accuracy >= 75) return null
      return {
        shortWhyEs: `En "${w.word}", el grupo de consonantes al inicio (como "sp", "st", "sk") puede ser difícil. En español se agrega una "e" antes.`,
        tipEs: `No digas "e" antes de la S. Empieza directamente con el sonido S y pasa rápido a la siguiente consonante.`,
        practiceEs: `Practica: "school" (no "eschool"), "stop" (no "estop"). Empieza con SSS y añade la consonante.`,
      }
    },
  },

  // ─── SH (ʃ) vs S ──────────────────────────────────────
  {
    code: 'sh_sound',
    match: (w) => {
      if (!spellMatch(w, /sh/)) return null
      const weakSh = hasWeakPhoneme(w, /^ʃ$/, 70)
      if (!weakSh && w.accuracy >= 70) return null
      return {
        shortWhyEs: `En "${w.word}", el sonido SH (/ʃ/) puede confundirse con la S normal. Son diferentes.`,
        tipEs: `Para SH, redondea los labios como si fueras a decir "shhh" para callar a alguien. La lengua está más atrás que para la S.`,
        practiceEs: `Practica: "ship" vs "sip", "she" vs "see". Redondea los labios para SH.`,
      }
    },
  },

  // ─── Generic mispronunciation fallback ─────────────────
  {
    code: 'mispronunciation_generic',
    match: (w) => {
      if (w.errorType === 'Mispronunciation' || (w.accuracy < 60 && !w.errorType)) {
        return {
          shortWhyEs: `La pronunciación de "${w.word}" no fue clara. Puede haber diferencias en los sonidos.`,
          tipEs: `Escucha cómo un hablante nativo dice "${w.word}" (puedes buscarlo en Google Translate o Forvo) y trata de imitar el ritmo y los sonidos.`,
          practiceEs: `Repite "${w.word}" 5 veces, cada vez más lento y claro.`,
        }
      }
      return null
    },
  },
]

// ── Public API ─────────────────────────────────────────────

/**
 * Run all coaching rules against a list of words.
 * For each matched rule, checks the knowledge base for an override.
 * Mutates `word.reasonCodes` and `word.coaching` in place.
 * Returns the same array for convenience.
 */
export function applySpanishCoaching(words: WordEntry[]): WordEntry[] {
  for (const word of words) {
    // 1) Coach-authored KB rules (can apply even when Azure scores are high)
    const kbMatch = matchCoachWordRule(word)
    if (kbMatch) {
      const override = getOverride(kbMatch.reasonCode, word.word)
      word.reasonCodes = [kbMatch.reasonCode]
      word.coaching = override ?? kbMatch.coaching
      continue
    }

    // 2) Skip words with no issues (built-in rules)
    if (word.errorType === 'None' && word.accuracy >= 85) continue

    const matches: RuleMatch[] = []

    for (const rule of RULES) {
      const defaultCoaching = rule.match(word)
      if (defaultCoaching) {
        // Check for knowledge-base override
        const override = getOverride(rule.code, word.word)
        matches.push({
          code: rule.code,
          coaching: override ?? defaultCoaching,
        })
      }
    }

    if (matches.length > 0) {
      // Use the first (highest-priority) match for coaching
      word.reasonCodes = matches.map((m) => m.code)
      word.coaching = matches[0]!.coaching
    }
  }

  return words
}
