# Step 3 — Design Recommendations (Cursor writes, Kyle decides)

**Working agreement:** each proposal is standalone, references an audit finding + a Mobbin pattern, and checks every constraint in `00-BRIEF.md`. Nothing is implemented until its status is ✅ Approved by Kyle. Cursor never edits a status line.

## Proposal format (copy per proposal)

```
## P## — [Short title]

**Status:** ⬜ Pending  (Kyle sets: ✅ Approved / ❌ Rejected / 🔁 Deferred)

**Audit finding:** [## from 01-AUDIT.md — what currently exists / is missing]
**Pattern evidence:** [Mobbin capture or Manus report section]
**Proposed change:** [concrete: what screen, what component, what behavior]
**Constraint check:** [confirm against 00-BRIEF.md hard constraints — any violation kills it]
**Effort:** S / M / L (files touched, roughly)
**Risk:** [what could break / what persona would hate about it]
```

## Ordering rule

Group proposals into waves so Kyle can review in short sessions:

- **Wave 1 — Reader experience** (A1–A8): typography, tap-word sheet, sentence audio, IPA, comprehension checks. Highest persona impact.
- **Wave 2 — Shell & navigation** (B9–B12): bottom nav, Home continue card, deep-link entry.
- **Wave 3 — Sistema de 8 surfaces** (C13–C15): lesson-type page consistency, class mirror.
- **Wave 4 — Visual system** (E18–E22): evolve Paper Light only. Tokens, states, accessibility, motion, and in-flight button feedback (P05).
- **Wave 5 — Pressure-language cleanup** (F22): every Lighthouse violation found in audit, as one proposal per surface.

## Special decision: visual theme

**Decided 2026-09-27: keep Paper Light.** Do not present dark graphite/teal as an option in proposals. Wave 4 evolves the shipped tokens, states, and accessibility inside Paper Light.

---

## Kyle decisions (2026-09-27)

Constraints for every proposal below. Do not reopen these unless Kyle changes them.

| # | Decision | Implication |
|---|---|---|
| 1 | Keep Paper Light | No dark theme, no theme toggle. Manus §8.2 tokens are reference only. |
| 2 | Sentence highlight on stories | Quiet sentence/phrase block during story audio. Not word-level yellow karaoke. Songs keep karaoke on the Truquitos step. |
| 3 | Reject English-first | First tap still shows Spanish (plus IPA and audio). No extra Traducir tap. |
| 4 | Preview only if marked free | Logged-out visitors may open free catalog rows only. Class/paid lessons stay behind login. Use `stories.is_free` (already in schema, default false). |
| 5 | Map numbers for students; percents for teachers; exam percent stays | Student UI: counts, fractions, missed-word maps. Teacher analytics may use percents. Group exam score step keeps percent for now. |
| 6 | Word sheet + persist underline + Inicio resume | P01–P03 as amended 2026-09-27 evening. P04 is Manus, not Kyle: no need-state chips. P05 covers motion and button feedback. |
| 7 | Sentence highlight, free preview, student percents | P06–P08 approved 2026-09-27 with P01–P03 and P05. P04 rejected (Manus chips). |

---

## Proposals

### Wave 1 — Reader

## P01 — Word help as a short bottom sheet

**Status:** ✅ Approved  (Kyle, 2026-09-27: implement P01–P03, P05–P08; P04 no-build)

**Audit finding:** A2 — `WordTooltip.tsx` pins a 320px floating card under the word. Tap, not long-press. Spanish + IPA + audio + "No entendí" (and teacher flags) already live on first open. The card covers the line. It is not the bottom-sheet pattern used for "Ver el texto" (`StoryTextSheet.tsx` / DESIGN.md Bottom Sheet).

**Pattern evidence:** [Speak dictionary sheet](https://mobbin.com/screens/6cda687c-0218-4908-9d4c-86fa22cfc242) (word, speaker, translation, POS, example, page stays behind). [Apple Maps grabber sheet](https://mobbin.com/screens/b14f305a-398b-42cb-8099-168770af33db) (short sheet, drag handle, dismiss). [Matter selection bar](https://mobbin.com/screens/058e54c1-2c6e-4568-939e-72ca0bd6ef85) is the wrong primary: too little room for IPA + play + No entendí. Manus: tap-any-word bottom sheet.

**Kyle (2026-09-27):** Sheet is acceptable. Current open/close is not smooth enough. Ship P01 only with P05 motion (enter and exit), not a hard cut or a snappy pop. Do not reuse "whatever 200ms we have today" if that is the inelegant motion he is seeing.

**Proposed change:** Replace the floating tooltip with a **short** paper sheet that rises from above the glass step-nav (same family as "Ver el texto", not 75vh). Grabber, tap outside, swipe down, or X to close. One word at a time. The tapped word stays visible in the story above the sheet.

Open and close must be **choreographed**: same 200ms ease-out fade + slide as DESIGN.md, but applied to **both** directions (today the tooltip often just appears/disappears). `prefers-reduced-motion`: jump to open/closed, no slide. Sheet contents (Kyle decision 3: Spanish on first open): Spanish; IPA; play; POS; expression; "No entendí"; teacher flags. 44px. Paper Light.

Do not auto-play audio on open. Same component on story, dialogue, lyrics, bio, and "Ver el texto" word taps.

If rejected: keep the current tooltip, still apply P05 motion to it.

**Constraint check:** Tap not long-press. 375px. Spanish first (locked). No gamification. Preview still cannot save lookups. WCAG: focus trap, Escape, 44px, reduced motion. $0 infra.

**Effort:** M — plus P05 for the animation quality. `WordTooltip.tsx`, `InteractiveStory.tsx`, `globals.css`, DESIGN.md word-sheet height (hug content, cap ~45vh).

**Risk:** Sheet + sticky audio + step-nav on 375px. A poorly tuned animation is worse than the tooltip; P05 is the gate.

---

## P02 — Looked-up words persist on the page

**Status:** ✅ Approved  (Kyle, 2026-09-27: persist until tap to clear; keep lookup row)

**Audit finding:** A2 — `word-seen` underline is only `seenPositions` in `InteractiveStory.tsx` memory. It dies on refresh. Lookups are already written to `word_lookups` (`recordWordLookup` in `src/app/lesson/[slug]/actions.ts`, unique `user_id` + `word_id`). Teachers already see those rows. Students do not see them again in the story.

**Pattern evidence:** Quiet mark in the text, not a vocabulary casino. Speak/Kindle-style "you opened this word" is a residual underline, not a deck. Avoid Duolingo XP-on-lookup. Map numbers (Kyle decision 5): a count of words touched can stay on `/progress` ("Palabras que tocaste"); do not add a student percent.

**Kyle (2026-09-27):** Persist the underline. A later tap on that same word **clears** the underline. Teacher still keeps the lookup for reteaching.

**Proposed change:** Logged-in student: hydrate underlines from `word_lookups` on load. First tap on a word: open help (P01) and persist the quiet `word-seen` underline.

**Clear:** tapping an already-underlined word again removes the student underline. The sheet may still open so they can hear the word; the mark is what toggles off. Do **not** delete the `word_lookups` row (teachers need it). Add a student-cleared flag (e.g. `cleared_at` on the lookup, or an equivalent) so the underline can stay off across visits without erasing evidence.

Free preview / logged out: no persist. Teacher preview: no writes.

No SRS, no "revisited" badge, no student percent of words looked up.

**Constraint check:** Map for the student (underline on/off), percents stay off this surface. RLS unchanged. Preview stays clean.

**Effort:** M — was S; toggle-off needs a column or equivalent, not only a SELECT. Unique `user_id` + `word_id` remains.

**Risk:** Two jobs on one tap (open help vs clear mark) can confuse. Copy in the sheet should say the mark is gone if they just cleared it. Dense underlines still possible until they clear.

---

### Wave 2 — Shell

## P03 — Inicio: class day wins; resume only when there is no live class to join

**Status:** ✅ Approved  (Kyle, 2026-09-27: label is Seguir la lección)

**Audit finding:** B10 — Inicio is greeting → today's class card (countdown / join hero / clase terminada) → "Clases completadas" bar → Este mes rows. No continue-this-story card. `/progress` has "Siguiente actividad" from `user_progress` + recommend-next, not a resume point on Inicio. Audio position is not stored.

**Pattern evidence:** [Headspace Next Session](https://mobbin.com/screens/cda46030-4c2b-4b7c-b6f1-6e08db0ddf96) (one primary action). [Spotify Start listening](https://mobbin.com/flows/110c08ea-444c-48c8-9c0a-9ef6aa2389f5) (resume rows, then a short shelf). [Netflix one Play](https://mobbin.com/screens/f7087383-70ec-4e3a-85c7-a4e5428cdc25). Avoid Netflix catalog home. Classroom product: the 90-minute Zoom is the job of that day.

**Kyle (2026-09-27):** Yes to the class-day vs resume split. Do not say "Seguir leyendo". Music (and writing, exam, Traducción) are not reading. Use **Seguir la lección** (one label for every type). "Seguir repasando" is also acceptable; pick one verb and keep it.

**Proposed change:** One focal point per visit.

- **Class day, join window (T-10 through scheduled end):** terracotta join hero only. No resume above it.
- **Class day, before join or after "clase terminada":** existing class card first. Resume **under** it if any.
- **Not class day:** one resume row under the greeting: lesson name + **Seguir la lección**. No percent. No time-left.
- Este mes unchanged.

No audio timestamp in this proposal. Resume opens the lesson URL.

**Constraint check:** No streak, no catalog wall, no due dates. Month bar stays a count. 375px: one hero.

**Effort:** M — dashboard + `user_progress` href. DESIGN.md Inicio copy.

**Risk:** "Lección" on a live-only Zoom row is odd; only show resume for types that have an app page.

---

## P04 — Do not add Read / Listen / Repair / Pronounce / Class as home labels

**Status:** ❌ Rejected  (Kyle, 2026-09-27: Manus chips, not a Profe Kyle request. No-build.)

**Audit finding:** B9 / B10 — Shell is already Inicio, Lecciones, Herramientas. Herramientas is empty ("Próximamente: la biblioteca de sonidos"). Home is a class month, not a need-state picker. Manus wanted Read / Listen / Repair / Pronounce / Class as entry labels.

**Pattern evidence:** [Endel mode tabs](https://mobbin.com/screens/ec1370bc-7d8f-4987-91f3-b7e8fa7f6a55) (Now / Focus / Relax / Sleep) — adapt only if this were a self-study app with those jobs on the home screen. [Headspace Today list](https://mobbin.com/screens/efc82d96-660f-4e91-bff9-1f3d083c34eb) — finite rows, not a second tab bar. This product's job on Inicio is "what class is it / where is my month," not "pick a need."

**Kyle (2026-09-27):** He did not ask for these chips. They are from the Manus report, copied into `00-BRIEF.md` ("need-state entry labels: Read / Listen / Repair / Pronounce / Class") and into the Mobbin guide (Headspace/Endel). Not a Profe Kyle request.

**Proposed change:** Close this item. Do not add Leer / Escuchar / Reparar / Pronunciar / Clase anywhere. No Herramientas chip row "for later." Consumer self-study can invent entry labels in its own slice if that product exists.

**Constraint check:** N/A (no-build).

**Effort:** None.

**Risk:** None. The brief still lists Manus labels as research; they are not a backlog item unless Kyle asks later.

---

## P05 — Motion and in-flight feedback on actions

**Status:** ✅ Approved  (Kyle, 2026-09-27: same 44px control, in-flight verb, every server-hitting primary)

**Audit finding:** E22 — First audit pass recorded empty/error/skeletons and missed what Kyle actually feels: word help (and other sheets) open and close without an elegant enter/exit; primary buttons often do not show loading or a short message while work is in flight or just finished.

**Pattern evidence:** DESIGN.md already: 200ms ease-out fade + slide; no bounce; reduced motion honored. Calm product: motion answers the tap, it does not decorate. Headspace/Speak sheets move with the finger; they do not pop.

**Proposed change:** Two layers, Paper Light, Kyle's Spanish.

1. **Sheets and word help (blocks P01):** Enter and exit both animate (slide + fade, 200ms, ease-out). Overlay fades. Reduced motion: instant. No spring, no scale pop.

2. **Buttons that hit the server:** On click, the control goes disabled, 44px min, visible in-flight state (same label or "Guardando…" / "Enviando…" in Kyle's voice, not a spinner-only void). On success, a short confirmation before the next view (or inline "Guardado") then settle. On failure, existing "Algo salió mal" + retry. Apply first to: word "No entendí", Comprobar (dictation/personal), Entregar (writing/exam/music blanks), teacher flag save. Then the same pattern for other primary actions.

Not in scope: skeleton page loads (still E20), confetti, toast piles.

**Constraint check:** No gamification. No em dashes in copy. Reduced motion. 375px. Does not invent scores.

**Effort:** L across the app if every button is in the first slice; M if word sheet + the four student submit actions ship first.

**Risk:** In-flight copy that stays on screen too long feels like a stall. Keep it short. Disabled buttons must still look like the same control, not a grey corpse.

---

### Wave 1 — Reader (continued)

## P06 — Quiet sentence highlight during story audio

**Status:** ✅ Approved  (Kyle, 2026-09-27: stories/dialogue/Movie Talk transcript; songs keep Truquitos karaoke)

**Audit finding:** A3 — Word timestamps plus a RAF loop in `InteractiveStory.tsx` add `.word-audio-current` (hardcoded yellow `rgb(254 240 138)` in `globals.css`). DESIGN.md still describes one-word karaoke. Kyle 2026-09-27: sentence-level highlight on stories; song karaoke stays on Truquitos.

**Pattern evidence:** [ElevenReader](https://mobbin.com/screens/1902da38-c46f-425a-a610-1b1a359c536c) pale block on the current passage, not a bouncing word. [Blinkist](https://mobbin.com/screens/ea3a5a5a-2509-4c4e-b35e-69955e2349e4) player under the column. Avoid Apple Books "0%" chrome. Teaching-note yellow stays a different job (tap for note); do not reuse the karaoke yellow for both if they would collide.

**Proposed change:** While story/dialogue (and Movie Talk transcript if it uses the same player) audio plays, highlight the **current sentence or paragraph**, not the current word. Drive the range from existing word timestamps (first–last word in that sentence). Visual: a quiet paper tint (`--accent-softer` or a token added in DESIGN.md), no yellow-200, no 0.1s flash per word. Sticky transport unchanged (P05 motion if it moves).

Songs: no change on Truquitos karaoke (`line_timestamps`). Do not apply sentence blocks there.

`prefers-reduced-motion`: keep a static current-sentence mark; do not animate the block chasing the playhead.

Optional later (not this proposal): ElevenReader "Back to current" if they scroll away.

**Constraint check:** Input-first. No karaoke competing with reading on stories. Paper Light. 375px. No percent on the player.

**Effort:** M — `InteractiveStory.tsx` highlight loop, `globals.css`, DESIGN.md story step (remove "one word highlighted yellow"). Timestamps stay; mapping words → sentence is the work.

**Risk:** Punctuation-poor paragraphs become one giant highlight. Dialogue lines (`Name:`) should highlight **that line**, not the whole scene. Movie Talk speaker band is separate; do not double-highlight a whole character's turns unless the playhead is on that line.

---

### Wave 2 — Shell (continued)

## P07 — Logged-out preview only when the lesson is marked free

**Status:** ✅ Approved  (Kyle, 2026-09-27: `stories.is_free` only; session links stay login-first)

**Audit finding:** B11 — `loadSessionAccess` redirects any logged-out visitor with `?session=` to `/login?next=…` before lesson text. Kyle: not all lessons; only rows with `stories.is_free`. Schema and RLS already allow public read of free stories (`is_free` default false). `getFreeStory` still assumes a single demo row. Contenido has **no** `is_free` control (grep on teacher editors: none).

**Pattern evidence:** Value before account, declining never punishes (no blur of a paid story). Adoption is a **marked** free lesson, not every WhatsApp class link. Two-site split: the app is not a marketing site; a free `/lesson/[slug]` is the product sample.

**Proposed change:**

1. **Class links (`?session=`):** stay login-first. Attendance and group membership need an account. Do not treat a session URL as a public preview even if the catalog row is free.

2. **Open lesson URL (`/lesson/[slug]`, no session):** logged out may see the reader **only if** `stories.is_free`. No save, no lookups persist (P02), no exam/writing submit. If not free: existing Kyle-voice wall ("Pídele el link…"), **do not** render `body_text`. Tighten the page so knowing a paid slug is not enough without auth (today `getStoryBySlug` loads by slug after access `open`).

3. **Writing, exam, presentation, conversation:** no `is_free` column. Logged-out preview stays **off** until a later slice. Live-only types unchanged.

4. **Contenido:** on the story editor (every `stories` kind), a clear control: "Vista previa sin cuenta" / free toggle. Default off. Kyle marks the sample(s). `getFreeStory` may return any free slug, not a hidden singleton.

**Constraint check:** Matches Kyle decision 4. Does not open the whole catalog. $0 infra. RLS already matches free SELECT; paid body must not leak through the RSC page.

**Effort:** M — `src/lib/sessions.ts` / lesson page gate, story editor field, copy. Possibly RLS check that non-free stories are not readable with the anon key (verify live policies; do not weaken them).

**Risk:** A class of students sharing a free slug instead of the session link: they read, nothing saves, you go blind. Copy on the free page: this is a sample; class is the Zoom link. Accidentally marking a paid month's story free publishes it.

---

### Wave 5 — Student numbers

## P08 — Student progress uses map numbers, not dictation percents

**Status:** ✅ Approved  (Kyle, 2026-09-27: drop student dictation %; keep counts, first-vs-last sentence, exam percent, DB accuracy for teachers)

**Audit finding:** F22 / Kyle decision 5 — `/progress` (`src/app/progress/page.tsx`) appends `el último alrededor de N%` from `dictationTrend.accuracy`. Reading already uses counts ("1 cuento", "a medias"). Palabras and pronunciación on that page are already counts. Group exam **keeps** `Tu puntaje` + percent. Teachers may use percents in Analíticas (not built).

**Pattern evidence:** Brief: dictation as what the sound became, never % score. Map numbers for students. Apple Books 0% was an avoid. Qualitative line already exists: "un poco mejor que al principio" / "todavía hay ruido" without a number.

**Proposed change:** On **student** `/progress` (and any student Inicio "práctica reciente" that later grows a percent): drop `formatPercent` and the "alrededor de N%" clause. Keep attempt **counts** and the existing first-vs-last **sentence** if it stays non-numeric. Do not add pronunciation `accuracyScore` to the student page.

Do **not** change the exam score step. Do **not** strip percents from teacher tools or from stored `accuracy` in the database (teachers still need the number).

**Constraint check:** Locked decision 5. No new gamification. Exam exception honored.

**Effort:** S — `src/app/progress/page.tsx` (and tests if they assert the percent string). DESIGN.md Progreso copy if it mentions percent.

**Risk:** Kyle uses the percent in 1:1s from the student phone; he would open teacher view instead. The qualitative dictation sentence still implies better/worse; that is a map, not a grade.


