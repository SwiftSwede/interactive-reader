# PRD Slice 50: Smart Paste Exam Creation + Post-Class Answer Entry

## Problem

Kyle's natural pre-class workflow is:

1. **Vocab list** — English words, one per line (no translations)
2. **Task 1** — English sentences with Spanish words in parentheses: `"the (fecha límite) to pay"`
3. **Task 2 (pre-int)** — 10 sentences, no `ok`/`fix` markings
4. **Task 2 (int)** — 7 sentences in correct order, no position numbers
5. **Task 3** — Spanish sentences, one per line, no English

The current system requires pipe syntax for all four sections, in TWO places:
- **ExamEditor** (`src/components/teacher/content/ExamEditor.tsx`) — the content catalog editor
- **CreateSessionForm** (`src/app/teacher/classes/[id]/CreateSessionForm.tsx`) — inline exam creation when scheduling a class

Both forms require:
- Vocab: `english | spanish`
- Task 1: `{spanish|english}` brace slots
- Task 2 (pre-int): `ok | sentence` / `fix | wrong | corrected`
- Task 2 (int): `3 | sentence`
- Task 3: `spanish | english | variation`

**The live type-check (built in Slice 49) makes answers unnecessary at creation time.** The teacher types accepted answers live during class. Students see green/red in real-time. So the prompt data doesn't need English answers pre-class.

**But post-class self-study needs answers.** The catalog fallback (`catalogAcceptedForItem` in `exam.ts`) reads `expectedEnglish` from slots and `acceptedEnglish` from translations. If these are empty, absentee self-study scoring doesn't work.

## Solution

Two features:

1. **Smart Paste at creation** — accept Kyle's natural format, auto-convert to the internal structure. Answers are optional. Applies to BOTH ExamEditor and CreateSessionForm.
2. **Post-class answer entry** — teacher edits the prompt in the content catalog to add answers after class, enabling self-study auto-check.

---

## Part A: Smart Paste Parsing

### A0. Both forms get smart paste

The smart paste parsers live in `src/lib/exam.ts`. Both `ExamEditor.tsx` and `CreateSessionForm.tsx` call `parseExamForm()` which calls the individual parsers. So the parser changes in A1-A5 automatically apply to both forms.

However, `CreateSessionForm.tsx` also needs:
- Updated hint text (same as A6)
- Updated placeholder text in textareas

The `CreateSessionForm` exam section is at lines 212-313. It has the same textareas with the same pipe-syntax placeholders. Update them to match A6.

**File**: `src/app/teacher/classes/[id]/CreateSessionForm.tsx` — textarea placeholders and hints (lines 212-313)

### A1. Vocab List — English-only accepted

**Current parser** (`parseVocabList` in `exam.ts:69-79`): requires `english | spanish` per line. Lines without a pipe are skipped.

**Change**: Accept lines with no pipe. If no pipe, treat the whole line as `english` with `spanish = null`.

```
Input:    "Deadline\nBrake\nGo off"
Output:   [{ english: "Deadline", spanish: null }, { english: "Brake", spanish: null }, ...]
```

Lines with a pipe still work (backward compat). The vocab display already shows English-only (commit e7a5aac hides Spanish), so `spanish: null` is safe.

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

**`parseSlotToken` change** (line 96): The current guard is `if (!spanishWord || !expectedEnglish) return null`. Change to `if (!spanishWord) return null` so slots with `expectedEnglish = null` are not dropped.

**Validation change**: The current validation (`parseExamForm` line 388-390) requires `flattenFillSlots(fillInTranslation).length >= 1`. This stays — but slots with `expectedEnglish = null` still count toward the minimum.

**Validation message change**: Update from `"En Tarea 1 usa {español|english} para marcar cada hueco. Al menos uno."` to `"En Tarea 1 usa (español) entre paréntesis para marcar cada hueco. Al menos uno."`

**File**: `src/lib/exam.ts` — `parseFillInTranslation`, `parseSlotToken`, `parseExamForm` validation message

### A3. Task 2 (pre-int) — Sentences without `ok`/`fix` markings

**Current parser** (`parseSentenceCorrection` in `exam.ts:175-201`): requires `ok | sentence` or `fix | wrong | corrected`. Lines without these flags are skipped.

**Change**: Accept bare sentences (no pipe, no flag). Store with `isCorrect: null` and `correctedVersion: null`.

```
Input:    "I need a car to move in the city."
Output:   { number: 1, sentence: "I need a car to move in the city.", isCorrect: null, correctedVersion: null }
```

Lines with `ok |` or `fix |` still work (backward compat). The student UI shows each sentence with "Correcta" / "Corregir" buttons — both are available when `isCorrect` is null. The teacher's live type-check toggle (`ExamCorrectToggle`) works the same way.

**Validation message change**: Update from `"Tarea 2: al menos 3 oraciones. ok | sentence  o  fix | wrong | corrected."` to `"Tarea 2: al menos 3 oraciones, una por línea."`

**File**: `src/lib/exam.ts` — `parseSentenceCorrection`, `parseExamForm` validation message

### A4. Task 2 (int) — Sentences in correct order, no position numbers

**Current parser** (`parseParagraphRestructuring` in `exam.ts:155-173`): requires `position | sentence`. Lines without a pipe are skipped.

**Change**: Accept bare sentences (no pipe). Assign `correctPosition = line number` (1-indexed). The parser stores sentences in the order pasted — which IS the correct order.

```
Input:    "Nowadays, most people view old superstitions as childish.\nAnd while they may not be backed by science, I believe superstitions should still be followed."
Output:   [
            { number: 1, sentence: "Nowadays, ...", correctPosition: "1" },
            { number: 2, sentence: "And while...", correctPosition: "2" }
          ]
```

Lines with `position |` still work (backward compat).

**Scrambling for student display**: The `ExamSession` component currently displays items in array order. When items are pasted in correct order, the array order IS the correct order — students would just type 1,2,3,4,5,6,7. That's not an exercise.

The component needs to:
1. **Shuffle the display order** using Fisher-Yates seeded by the prompt ID (stable across page reloads within the same session)
2. **Assign display letters** (A, B, C...) by shuffled display position, not array position
3. **Student types the `correctPosition` number** for each displayed item

Example: if the array is `[A=1, B=2, C=3, D=4]` and the shuffle produces `[C, A, D, B]`, the student sees:
```
A: "Sentence C text"     → student types: 3
B: "Sentence A text"     → student types: 1
C: "Sentence D text"     → student types: 4
D: "Sentence B text"     → student types: 2
```

The stored data is unchanged — only the display order is shuffled. The teacher's review mode shows the correct order.

**Validation message change**: Update from `"Tarea 2: al menos 3 oraciones. Formato: 3 | The first sentence."` to `"Tarea 2: al menos 3 oraciones en orden correcto, una por línea."`

**Files**: `src/lib/exam.ts` — `parseParagraphRestructuring`, `parseExamForm` validation message; `src/components/ExamSession.tsx` — display scramble logic

### A5. Task 3 — Spanish-only accepted

**Current parser** (`parseTranslationSentences` in `exam.ts:302-319`): requires at least one English answer after the Spanish. Lines with only Spanish are skipped.

**Change**: Accept lines with only Spanish (no pipe). Store with `acceptedEnglish: []` and `acceptableVariations: []`.

```
Input:    "Tengo la boca hinchada debido a una infección."
Output:   { number: 1, spanish: "Tengo la boca hinchada debido a una infección.", acceptedEnglish: [], acceptableVariations: [] }
```

Lines with `spanish | english` still work (backward compat).

**Validation change**: The current validation (line 402-404) requires `translationSentences.length >= 3`. This stays. But the per-line requirement for English is dropped.

**Validation message change**: Update from `"Tarea 3: al menos 3 oraciones. español | english | variation."` to `"Tarea 3: al menos 3 oraciones en español, una por línea."`

**File**: `src/lib/exam.ts` — `parseTranslationSentences`, `parseExamForm` validation message

### A6. ExamEditor and CreateSessionForm hint/placeholder text updates

Update hints and placeholders in BOTH `ExamEditor.tsx` and `CreateSessionForm.tsx`:

| Field | Current hint | New hint |
|---|---|---|
| Vocabulario | `english \| spanish` | `english` o `english \| spanish` |
| Tarea 1 | `{español\|english}` | `Oraciones con (español) en paréntesis` |
| Tarea 2 (pre-int) | `ok \| sentence o fix \| wrong \| corrected` | `Una oración por línea. Marca ok/fix después en clase.` |
| Tarea 2 (int) | `posición \| oración, ej. 3 \| Firstly...` | `Oraciones en orden correcto, una por línea` |
| Tarea 3 | `español \| english \| variación` | `Español, una por línea. Respuestas después de clase.` |

**Files**: `src/components/teacher/content/ExamEditor.tsx`, `src/app/teacher/classes/[id]/CreateSessionForm.tsx`

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

**Impact**: `catalogAcceptedForItem` (line 765) already does `.filter(Boolean)` — `null` is filtered out, so it returns `[]` when no answer exists. No crash. The `ExamFillBlanks` component needs to handle the case where there's no accepted answer — see Part E.

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

## Part C: Serialization Round-Trip

### C0. Problem

The `serializeFillInTranslation`, `serializeSentenceCorrection`, and `serializeTranslationSentences` functions (lines 210-263 of `exam.ts`) convert parsed data back to pipe syntax for the ExamEditor textareas. So if Kyle pastes bare sentences, saves, and comes back to edit, the textarea shows pipe syntax — not what he pasted.

Example: Kyle pastes `"the (fecha límite) to pay"`. The parser stores `slot.expectedEnglish = null`. On reload, `serializeFillInTranslation` produces `"the {fecha límite|} to pay"` — broken pipe syntax with an empty English side.

### C1. Fix: serialize back to bare format when no answers

Update the three serialize functions to detect "no answer" and serialize back to the bare format:

**`serializeFillInTranslation`**: If `slot.expectedEnglish` is null, output `(spanishWord)` instead of `{spanishWord|english}`.

```
Stored:   { spanishWord: "fecha límite", expectedEnglish: null }
Output:   "(fecha límite)"    ← bare parentheses, no braces
```

If `slot.expectedEnglish` has a value, output `{spanishWord|english|variations}` as before.

**`serializeSentenceCorrection`**: If `isCorrect` is null, output the bare sentence with no `ok`/`fix` prefix.

```
Stored:   { sentence: "I need a car to move in the city.", isCorrect: null }
Output:   "I need a car to move in the city."    ← bare sentence, no prefix
```

If `isCorrect` is true/false, output `ok | sentence` / `fix | wrong | corrected` as before.

**`serializeTranslationSentences`**: If `acceptedEnglish` is empty, output just the Spanish with no pipe.

```
Stored:   { spanish: "Tengo la boca hinchada...", acceptedEnglish: [] }
Output:   "Tengo la boca hinchada..."    ← bare Spanish, no pipe
```

If `acceptedEnglish` has values, output `spanish | english | variations` as before.

**`serializeVocabList`**: If `spanish` is null, output just the English word.

```
Stored:   { english: "Deadline", spanish: null }
Output:   "Deadline"    ← bare word, no pipe
```

**File**: `src/lib/exam.ts` — all four serialize functions

### C2. Result

Kyle pastes bare format → saves → comes back → sees bare format in the textareas. Once he adds answers (via Part D post-class entry), the serialize functions output pipe syntax with answers — which is fine because the answers now exist.

---

## Part D: Post-Class Answer Entry

### D1. Concept

After class, the teacher opens the exam prompt in the content catalog ExamEditor and adds answers. This is the same editor, with a new collapsible section: "Respuestas (después de clase)".

The ExamEditor already edits prompt content. The new section adds:
- Task 1 slots: show each slot's `spanishWord` with an input for `expectedEnglish`
- Task 2 (pre-int): show each sentence with "Correcta" / "Incorrecta" toggle + correction textarea (reuse `ExamCorrectToggle`)
- Task 2 (int): already has correct positions from creation — no answer entry needed
- Task 3: show each Spanish sentence with an input for English translation + "Añadir variación" button

### D2. ExamEditor "Respuestas" section

Add a collapsible section to the ExamEditor titled "Respuestas (después de clase)". When expanded, it shows structured answer-entry UI derived from the parsed prompt data (the `live` useMemo already has the parsed data).

**Task 1 slots** (one per slot, flattened):
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

**Implementation note**: The answer-entry fields update the same `task1Raw`/`task2Raw`/`task3Raw` strings that the textareas use, by serializing back with the answers filled in. This way there's a single source of truth — the raw strings — and the serialize functions from Part C handle the round-trip. Alternatively, the answer-entry fields could directly update the parsed JSONB and bypass the raw strings. Either approach works; the first is simpler to implement since the save flow already handles raw strings.

### D3. Copy answers from a live class session

If the teacher ran the live type-check during class, the `exam_class_answers` on the session already contain the teacher's typed answers. Add a button: **"Copiar respuestas de la clase"** that opens a session picker.

**Session picker**: A dropdown listing all `course_sessions` where `exam_prompt_id = this prompt's id`. Each option shows the session date and class name. When the teacher selects a session and confirms, a server action fetches that session's `exam_class_answers` and maps them to the prompt's structure:

- `t1-{index}` answers → `ExamFillSlot.expectedEnglish` + `acceptableVariations`
- `t2-{number}` answers → `ExamCorrectionItem.isCorrect` + `correctedVersion`
- `t3-{number}` answers → `ExamTranslationItem.acceptedEnglish` + `acceptableVariations`

The mapped answers populate the "Respuestas" section UI. The teacher reviews and saves.

**Server action**: New action in `src/app/teacher/content/actions.ts` — `copyExamClassAnswers(promptId, sessionId)` that returns the mapped answer data.

**File**: `src/components/teacher/content/ExamEditor.tsx` — session picker + copy button; `src/app/teacher/content/actions.ts` — new server action

### D4. What doesn't change

- The `acceptedForItem` function (line 850-861) already checks: teacher's live answers first → catalog fallback → empty. No change needed.
- The `catalogAcceptedForItem` function (line 756-793) already filters falsy values. No change needed.
- The `ExamSession` component's live type-check flow is unchanged.
- The absentee makeup flow is unchanged — it falls back to catalog answers, which now may be empty (no auto-check) or filled (auto-check works).

---

## Part E: Student Experience When No Answers Exist

### E1. The no-answer state

When a slot has `expectedEnglish = null`, a correction item has `isCorrect = null`, or a translation has `acceptedEnglish: []`, the student sees the input but gets no check feedback:

- **Task 1**: Student sees `(fecha límite)` as an underlined blank, types "deadline". No green/red check. The input looks the same as a checked input before the teacher reveals — just no colored marker after typing.
- **Task 2 (pre-int)**: Student picks "Correcta" or "Corregir" and types a correction. No confirmation if they're right. The buttons work but produce no colored feedback.
- **Task 3**: Student types translation. No check.

This is fine for **live class** — the teacher checks items live, and the realtime sync handles feedback. The student's phone gets green/red when the teacher checks each item.

For **absentee self-study before the teacher has filled in answers**: the student gets zero feedback. This is acceptable — the exam was designed for live class, not standalone self-study. Once the teacher fills in answers post-class (Part D), self-study auto-check activates automatically via the catalog fallback.

**No explicit "Respuestas no disponibles" indicator is needed.** The student simply doesn't see check marks. This matches the current behavior during live class before the teacher checks an item.

### E2. ExamFillBlanks component change

The `ExamFillBlanks` component currently renders green/red based on whether the student's answer matches `expectedEnglish`. When `expectedEnglish` is null:
- Render the input as before (underline style, Spanish placeholder)
- Skip the match check entirely
- No green/red coloring

**File**: `src/components/exam/ExamFillBlanks.tsx`

---

## Part F: Live Preview

### F1. Rendered student view in ExamEditor

The ExamEditor currently shows a count summary (line 229-238): `"Vista previa: 22 palabras · First sentence... · Tarea 2 10 · Tarea 3 10"`.

**Change**: Replace the count summary with a rendered preview of the first 3 items from each task, showing what students will see:

- **Task 1**: First 3 sentences with `(spanish)` shown as underlined blanks (reuse `ExamFillBlanks` in read-only mode, or a simplified preview component)
- **Task 2 (pre-int)**: First 3 sentences with Correcta/Corregir buttons (non-functional)
- **Task 2 (int)**: First 3 sentences with letter labels and number inputs (non-functional)
- **Task 3**: First 3 Spanish sentences with empty textareas (non-functional)

This is a read-only preview — no interactivity. It updates live as the teacher types in the textareas above (the `live` useMemo already re-parses on every keystroke).

**File**: `src/components/teacher/content/ExamEditor.tsx`

---

## Implementation Order

1. **Schema changes** (Part B) — make answers nullable in types. This is the foundation.
2. **Smart paste parsers** (Part A1-A5) — accept Kyle's natural format. Backward compatible. Update validation messages.
3. **Serialization round-trip** (Part C) — serialize back to bare format when no answers. Prevents broken pipe syntax on reload.
4. **ExamEditor + CreateSessionForm hints** (A6) — update placeholder text in both forms.
5. **Student no-answer UX** (Part E) — ExamFillBlanks skips check when no answer exists.
6. **Display scramble for Task 2 int** (A4) — Fisher-Yates shuffle in ExamSession.
7. **Live preview** (Part F) — rendered student view in ExamEditor.
8. **Post-class answer entry** (Part D) — new section in ExamEditor + session picker copy action.

Steps 1-4 are the minimum viable — they let Kyle paste his natural format, save, reload, and see the same format. Steps 5-8 are enhancements that can come in a follow-up.

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

The serialize functions (Part C) detect whether answers exist and output the appropriate format: bare when no answers, pipe syntax when answers exist. This means old prompts with answers still show pipe syntax on reload, and new prompts without answers show bare format on reload.
