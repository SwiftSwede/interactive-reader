# PRD Slice 50: Smart Paste Exam Creation + Post-Class Answer Entry

## Problem

Kyle's natural pre-class workflow is:

1. **Vocab list** — English words, one per line (no translations)
2. **Task 1** — English sentences with Spanish words in parentheses: `"the (fecha límite) to pay"`
3. **Task 2 (pre-int)** — 10 sentences, no `ok`/`fix` markings
4. **Task 2 (int)** — 7 sentences in correct order, no position numbers
5. **Task 3** — Spanish sentences, one per line, no English

The current ExamEditor requires pipe syntax for all four sections:
- Vocab: `english | spanish`
- Task 1: `{spanish|english}` brace slots
- Task 2 (pre-int): `ok | sentence` / `fix | wrong | corrected`
- Task 2 (int): `3 | sentence`
- Task 3: `spanish | english | variation`

**The live type-check (built in Slice 49) makes answers unnecessary at creation time.** The teacher types accepted answers live during class. Students see green/red in real-time. So the prompt data doesn't need English answers pre-class.

**But post-class self-study needs answers.** The catalog fallback (`catalogAcceptedForItem` in `exam.ts`) reads `expectedEnglish` from slots and `acceptedEnglish` from translations. If these are empty, absentee self-study scoring doesn't work.

## Solution

Two features:

1. **Smart Paste at creation** — accept Kyle's natural format, auto-convert to the internal structure. Answers are optional.
2. **Post-class answer entry** — teacher edits the prompt to add answers after class, enabling self-study auto-check.

---

## Part A: Smart Paste Parsing

### A1. Vocab List — English-only accepted

**Current parser** (`parseVocabList` in `exam.ts:69-79`): requires `english | spanish` per line. Lines without a pipe are skipped.

**Change**: Accept lines with no pipe. If no pipe, treat the whole line as `english` with `spanish = ""`.

```
Input:    "Deadline\nBrake\nGo off"
Output:   [{ english: "Deadline", spanish: "" }, { english: "Brake", spanish: "" }, ...]
```

Lines with a pipe still work (backward compat). The vocab display already shows English-only (commit e7a5aac hides Spanish), so `spanish: ""` is safe.

**File**: `src/lib/exam.ts` — `parseVocabList`

### A2. Task 1 — Auto-detect `(spanish)` in parentheses

**Current parser** (`parseFillInTranslation` in `exam.ts:111-134`): requires `{spanish|english}` brace tokens. Lines without braces produce sentences with zero slots.

**Change**: If the line has no `{...}` brace tokens, scan for `(text)` parenthetical tokens. Each parenthetical becomes a slot with `spanishWord = text` and `expectedEnglish = null`.

```
Input:    "I had until 5:00 p.m., the (fecha límite), to pay an old parking fine."
Output:   {
            sentence: "I had until 5:00 p.m., the (fecha límite), to pay an old parking fine.",
            slots: [{ spanishWord: "fecha límite", expectedEnglish: null, acceptableVariations: [], morphologicalNote: null }]
          }
```

Brace syntax `{spanish|english}` still works (backward compat). If both braces and bare parentheses appear on the same line, braces take priority and bare parentheses are left as literal text.

**Validation change**: The current validation (`parseExamForm` line 388-390) requires `flattenFillSlots(fillInTranslation).length >= 1`. This stays — but slots with `expectedEnglish = null` still count toward the minimum.

**File**: `src/lib/exam.ts` — `parseFillInTranslation`, `parseSlotToken`

### A3. Task 2 (pre-int) — Sentences without `ok`/`fix` markings

**Current parser** (`parseSentenceCorrection` in `exam.ts:175-201`): requires `ok | sentence` or `fix | wrong | corrected`. Lines without these flags are skipped.

**Change**: Accept bare sentences (no pipe, no flag). Store with `isCorrect: null` and `correctedVersion: null`.

```
Input:    "I need a car to move in the city."
Output:   { number: 1, sentence: "I need a car to move in the city.", isCorrect: null, correctedVersion: null }
```

Lines with `ok |` or `fix |` still work (backward compat). The student UI shows each sentence with "Correcta" / "Corregir" buttons — both are available when `isCorrect` is null. The teacher's live type-check toggle (`ExamCorrectToggle`) works the same way.

**File**: `src/lib/exam.ts` — `parseSentenceCorrection`

### A4. Task 2 (int) — Sentences in correct order, no position numbers

**Current parser** (`parseParagraphRestructuring` in `exam.ts:155-173`): requires `position | sentence`. Lines without a pipe are skipped.

**Change**: Accept bare sentences (no pipe). Assign `correctPosition = line number` (1-indexed). The parser stores sentences in the order pasted — which IS the correct order. The display component scrambles them for students.

```
Input:    "Nowadays, most people view old superstitions as childish.\nAnd while they may not be backed by science, I believe superstitions should still be followed."
Output:   [
            { number: 1, sentence: "Nowadays, ...", correctPosition: "1" },
            { number: 2, sentence: "And while...", correctPosition: "2" }
          ]
```

**Scrambling**: The `ExamSession` component currently displays items in array order (which is the paste order = correct order). The component needs to **shuffle the display order** while keeping the stored order intact. Use a Fisher-Yates shuffle seeded by the prompt ID (so the scramble is stable across page reloads within the same session).

Lines with `position |` still work (backward compat).

**Files**: `src/lib/exam.ts` — `parseParagraphRestructuring`; `src/components/ExamSession.tsx` — display order

### A5. Task 3 — Spanish-only accepted

**Current parser** (`parseTranslationSentences` in `exam.ts:302-319`): requires at least one English answer after the Spanish. Lines with only Spanish are skipped.

**Change**: Accept lines with only Spanish (no pipe). Store with `acceptedEnglish: []` and `acceptableVariations: []`.

```
Input:    "Tengo la boca hinchada debido a una infección."
Output:   { number: 1, spanish: "Tengo la boca hinchada debido a una infección.", acceptedEnglish: [], acceptableVariations: [] }
```

Lines with `spanish | english` still work (backward compat).

**Validation change**: The current validation (line 402-404) requires `translationSentences.length >= 3`. This stays. But the per-line requirement for English is dropped.

**File**: `src/lib/exam.ts` — `parseTranslationSentences`

### A6. ExamEditor hint text updates

Update the hint text under each textarea to reflect the new accepted formats:

| Field | Current hint | New hint |
|---|---|---|
| Vocabulario | `english \| spanish` | `english` o `english \| spanish` |
| Tarea 1 | `{español\|english}` | `Oraciones con (español) en paréntesis` |
| Tarea 2 (pre-int) | `ok \| sentence o fix \| wrong \| corrected` | `Una oración por línea. Marca ok/fix después en clase.` |
| Tarea 2 (int) | `posición \| oración, ej. 3 \| Firstly...` | `Oraciones en orden correcto, una por línea` |
| Tarea 3 | `español \| english \| variación` | `Español, una por línea. Respuestas después de clase.` |

**File**: `src/components/teacher/content/ExamEditor.tsx`

---

## Part B: Schema Changes — Nullable Answers

### B1. ExamFillSlot.expectedEnglish → nullable

**Current** (`types/index.ts:257-262`):
```ts
export interface ExamFillSlot {
  spanishWord: string;
  expectedEnglish: string;           // required
  acceptableVariations: string[];
  morphologicalNote: string | null;
}
```

**Change**:
```ts
export interface ExamFillSlot {
  spanishWord: string;
  expectedEnglish: string | null;    // nullable — null means "no answer yet"
  acceptableVariations: string[];
  morphologicalNote: string | null;
}
```

**Impact**: `catalogAcceptedForItem` (line 765) already does `.filter(Boolean)` — `null` is filtered out, so it returns `[]` when no answer exists. No crash. The `ExamFillBlanks` component needs to handle the case where there's no accepted answer (no green/red check, just a plain input).

### B2. ExamCorrectionItem.isCorrect → nullable

**Current** (`types/index.ts:276-281`):
```ts
export interface ExamCorrectionItem {
  number: number;
  sentence: string;
  isCorrect: boolean;
  correctedVersion: string | null;
}
```

**Change**:
```ts
export interface ExamCorrectionItem {
  number: number;
  sentence: string;
  isCorrect: boolean | null;         // null means "not yet marked"
  correctedVersion: string | null;
}
```

**Impact**: `catalogAcceptedForItem` (line 775-780) checks `item.isCorrect` — when `null`, return `[]`. The `ExamCorrectToggle` component's "Correcta" / "Incorrecta" buttons both start inactive when `isCorrect` is null. The teacher marks them during live type-check.

### B3. ExamTranslationItem.acceptedEnglish → can be empty array

**Current** (`types/index.ts:283-288`):
```ts
export interface ExamTranslationItem {
  number: number;
  spanish: string;
  acceptedEnglish: string[];         // required, at least one
  acceptableVariations: string[];
}
```

**Change**: No type change needed — `acceptedEnglish: string[]` already allows `[]`. The parser change (A5) is what enables empty arrays. `catalogAcceptedForItem` (line 788) spreads `acceptedEnglish` — empty array produces `[]`. No crash.

### B4. ExamVocabItem.spanish → nullable

**Current** (`types/index.ts:251-255`):
```ts
export interface ExamVocabItem {
  id: number;
  english: string;
  spanish: string;
}
```

**Change**:
```ts
export interface ExamVocabItem {
  id: number;
  english: string;
  spanish: string | null;            // null when Kyle pastes English-only
}
```

**Impact**: The vocab display already shows English-only (Spanish hidden). No rendering change needed.

**File**: `src/types/index.ts`

---

## Part C: Post-Class Answer Entry

### C1. Concept

After class, the teacher opens the exam prompt in the ExamEditor and adds answers. This is the same editor, just in a different mode: "answer entry" instead of "content creation."

The ExamEditor already edits prompt content. The change is:
- Task 1 slots: show each slot's `spanishWord` with an input for `expectedEnglish`
- Task 2 (pre-int): show each sentence with "Correcta" / "Incorrecta" toggle + correction textarea (reuse `ExamCorrectToggle`)
- Task 2 (int): already has correct positions from creation — no answer entry needed
- Task 3: show each Spanish sentence with an input for English translation + "Añadir variación" button

### C2. ExamEditor "Answers" tab

Add a tab or collapsible section to the ExamEditor titled "Respuestas (después de clase)". When expanded, it shows:

**Task 1 slots** (one per slot):
```
Slot 1: (fecha límite)
  Accepted: [deadline________]
  Variations: [+ Añadir]
```

**Task 2 (pre-int)** (one per sentence):
```
Sentence 1: "I need a car to move in the city."
  [Correcta] [Incorrecta]
  Correction: [I need a car to get around the city.__]
```

**Task 3** (one per sentence):
```
Sentence 1: "Tengo la boca hinchada..."
  Accepted: [I have a swollen mouth...____]
  Variations: [+ Añadir]
```

The teacher fills these in post-class. On save, the prompt's `fill_in_translation`, `sentence_correction`, and `translation_sentences` JSONB fields are updated with the answers. The catalog fallback now returns real answers → self-study auto-check works.

### C3. Answer entry from live class answers

If the teacher ran the live type-check during class, the `exam_class_answers` on the session already contain the teacher's typed answers. Add a button: **"Copiar respuestas de la clase"** that reads the session's `exam_class_answers` and populates the prompt's slot/translation/correction fields.

This requires passing a `sessionId` to the ExamEditor when opened from a session context. The button calls a server action that fetches `exam_class_answers` from the session and maps them to the prompt's structure.

### C4. What doesn't change

- The `acceptedForItem` function (line 850-861) already checks: teacher's live answers first → catalog fallback → empty. No change needed.
- The `catalogAcceptedForItem` function (line 756-793) already filters falsy values. No change needed.
- The `ExamSession` component's live type-check flow is unchanged.
- The absentee makeup flow is unchanged — it falls back to catalog answers, which now may be empty (no auto-check) or filled (auto-check works).

**Files**: `src/components/teacher/content/ExamEditor.tsx`, new server action in `src/app/teacher/content/actions.ts`

---

## Part D: Live Preview

### D1. Rendered student view in ExamEditor

The ExamEditor currently shows a count summary (line 229-238): `"Vista previa: 22 palabras · First sentence... · Tarea 2 10 · Tarea 3 10"`.

**Change**: Replace the count summary with a rendered preview of the first 3 items from each task, showing what students will see:

- **Task 1**: First 3 sentences with `(spanish)` shown as underlined blanks
- **Task 2**: First 3 sentences (with Correcta/Corregir buttons if pre-int, with number inputs if int)
- **Task 3**: First 3 Spanish sentences with empty textareas

This is a read-only preview — no interactivity. It updates live as the teacher types in the textareas above.

**File**: `src/components/teacher/content/ExamEditor.tsx`

---

## Implementation Order

1. **Schema changes** (Part B) — make answers nullable in types and parsers. This is the foundation.
2. **Smart paste parsers** (Part A1-A5) — accept Kyle's natural format. Backward compatible.
3. **ExamEditor hints** (A6) — update placeholder text.
4. **Display scramble for Task 2 int** (A4) — Fisher-Yates shuffle in ExamSession.
5. **Live preview** (Part D) — rendered student view.
6. **Post-class answer entry** (Part C) — new section in ExamEditor + copy-from-session action.

Steps 1-3 are the minimum viable — they let Kyle paste his natural format and go. Steps 4-6 are enhancements.

---

## What Cursor Already Built (Do Not Rebuild)

- Live type-check with teacher answer entry (`ExamItemCheck`, `ExamCorrectToggle`)
- Individual student answers (no group writer)
- Shared class timer with pens-down freeze
- Step pacing (lock/unlock Parte 1/2/3/Puntaje)
- Score publication
- Vocab list display (English-only, collapsible)
- Catalog fallback for self-study scoring (`catalogAcceptedForItem`, `acceptedForItem`)
- Absentee 45-minute makeup timer
- `ExamFillBlanks` component (music-style inline blanks)
- Realtime sync via Supabase channels

---

## Backward Compatibility

All parser changes are additive — they accept new formats AND the old pipe syntax. Existing exam prompts (Agosto Niñera, Agosto Jefes, Septiembre Tráfico, Septiembre Supersticiones) were seeded with pipe syntax and will continue to work unchanged.
