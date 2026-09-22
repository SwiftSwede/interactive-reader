---
title: Interactive Reader App — Product Requirements Document
type: concept
created: 2026-08-12
updated: 2026-09-22
tags: [concept, product, web-app, PRD, interactive-reader]
---

# Interactive Reader App — PRD

> Living document. Updated as decisions are made and features are built.
> Owner: Kyle Rascon (Profe Kyle)
> Status: **Phases 1, 1.5, 2a, 2b, 2c, 2.5, 3, and 4 are COMPLETE.** **Phase 5 classroom lesson types are built** (group exam 49a–49e; dialogue 45; Movie Talk 46; music 47 as `Story.kind = "song"`; video summary translation 54; presentation 56a). Presentation 56a is the teachable student page, teacher assign, and Paris seed. **Slice 55 (teacher content editor) is built:** `/teacher/content` edits existing catalog rows of every kind plus writing, exam, presentation, and conversation; Movie Talk scene CRUD; no AI toolbox. **Slice 66 (catalog CRUD) is built:** delete unreferenced rows (session-guarded, `CATALOG_ADMIN_EMAILS`); create writing/exam/presentation/conversation; Nueva clase compose-or-copy for those three. Story-kind create stays the import pipeline. **Slice 67 (Ver como estudiante) is built:** session cookie `pk_student_preview`, rail interstitial, read-only student chrome for teachers; no schema. **Slice 67b (lesson header toggle) is built:** Vista de estudiante / Vista de profe on session-backed lessons, same URL. **Slice 57 (student dashboard shell) is built:** Inicio, Lecciones, Herramientas, Perfil, live-only session types, recording banner. **Slice 58 (teacher dashboard shell) is built:** Este mes, Grupos, Estudiantes, Analíticas, 3-column TeacherShell. **Slice 58b is built:** `courses.zoom_url` plus dual join links (app + Zoom) on the student Inicio card and teacher Este mes / group page. **Slice 59 is built:** manual attendance (class page Estudiantes + group-page right panel) and Zoom-style YouTube recording paste per session. **Slice 60 (Nuevo mes generator) is built:** commit fafd397 (2026-09-22) 8-row monthly template including `flex`, assign-on-strip, optional `courses.theme`, auto-archive prior months at that level. **Slice 61 (Conversation class 4-4-4, `/conversation?session=`) is built:** commit 75a10f9 (2026-09-08) — teacher-synced rounds, plan picker (6 rondas / 3×10 / sin rondas), questions composed in Nueva clase. **Slice 62 (dialogue / Movie Talk / song session types + word flagging, ADR 009) is built:** commit 4757073 (2026-09-08) — first-class session types with kind-filtered pickers, teacher word flags (bold/underline), student No entendí requests with Realtime badges. **Slice 63 (Music class full build) is built:** commit 5b5c561 (2026-09-09) — teacher-paced steps, live worksheet, bio, meaning, IPA Truquitos, karaoke degrades without timestamps; see the Slice 63 row. **Slice 64 (Movie Talk class full build) is built:** commit a0b15d1 (2026-09-21) — teacher-paced scene steps, character band, teacher class answers, word-flag notes (ADR 014). **Slice 65 (Pronunciación Class 2) is built:** Nueva clase can create a live-only pronunciation session; Class 1 dictado/coral/pronunciación stay hidden for students until that session's `session_start_time`. Slice 39 `/progress` remains the progress drill-down. Consumer paid tier, beginner UI, reverse translation, and print (slices 40–44, 50–53) are not built. Production at `https://learn.profekyle.com`: live Stripe webhook verified (200). Remaining ops: Supabase Auth Site URL + redirect URLs. Classroom placement (`classroom_level`) is separate from Stripe price: teacher move sets the live Zoom group for this month and future courses.

---

## 1. Product Overview

### What we're building

A web-based interactive reading platform that hosts Profe Kyle's existing self-learning English courses (stories, dialogues, comprehension questions, pronunciation drills) in an interactive format where learners can hover/click any word to get instant Spanish translation, phonetic transcription, and audio pronunciation.

### The problem it solves

Kyle's courses are high-quality but have always been sold as PDF + audio downloads. The Latin American market has been burned by low-quality self-learning courses, and a PDF is a PDF — customers can't distinguish quality before buying. The interactive reader turns the product from "another PDF course" into "an experience you can try for free and feel the difference."

### The business model

```
Free story (no signup) → $47 lifetime all-access → $7-9/month AI Coach (future)
                                    ↓
                        Some students reach pre-intermediate
                                    ↓
                        Upsell to live group classes (main revenue)
```

### Target audience

Spanish-speaking Latin American adults learning English. Phone-first users. Skeptical of self-learning courses due to past experiences with institutes, Duolingo, and low-quality PDF courses.

---

## 2. Guiding Principles

1. **Reading and listening are the foundation.** The app's primary activity is reading stories. Everything else (SRS, TPRS, pronunciation) is supplementary and must never interrupt the reading experience.
2. **The free story IS the sales page.** No separate landing page with promises. The product demonstrates itself.
3. **Zero download friction.** Web app + PWA. No App Store. Link in, reading in 5 seconds.
4. **Kyle's phonetic system is the differentiator.** The ö/ü/ä/ör/ë symbols, the Práctica Coral, the cultural content — this is what makes it not-Duolingo.
5. **One codebase, all devices.** Next.js + PWA. No separate iOS/Android apps.
6. **Static content is free at runtime.** Audio files generated once, hosted as MP3s. No per-listen API costs.
7. **Attempt before help.** A learner gets a real chance to listen, read, or respond before a transcript, correct answer, or feedback is shown. Help should explain one small problem and create one clear next action.
8. **Reading creates evidence.** The reader remains calm and uncluttered, but relevant interactions can show what a learner needs next: a word they cannot hear, a phrase they cannot separate, a sound they are practicing, or a response they can improve.
9. **AI supports practice, not judgment.** AI feedback is formative, specific, and in Kyle's voice. It does not predict exam scores, diagnose a learner globally, or pretend to replace a teacher.
10. **Dictation is a listening tool, not a spelling test.** Dictation reveals where the ear fails. The Práctica Coral sentences, with their phonetic respelling, serve as both the dictation prompt and the diagnostic scoring matrix. Learners train pronunciation without realizing it, because perception training IS pronunciation training.
11. **Translation is a scaffold, not the enemy.** Reverse translation (L1 to L2) builds active recall through desirable difficulty. The original text is the answer key. No teacher needed. This is not grammar-translation; it is meaning-based reconstruction that the learner eventually graduates from.
12. **Micro-explanations teach the learner why each activity works.** One or two sentences in Kyle's voice, placed at the moment the learner encounters the activity. Never a wall of text. Never a textbook chapter. Just enough to reframe "this is a boring school exercise" into "this is why this works."
13. **UI Design North Stars: Spotify (mobile) + Netflix (desktop).** The app follows Spotify's mobile-first navigation pattern (bottom tabs, card lists, persistent playback bar) and Netflix's desktop pattern (horizontal rows, grid density, hover interactions). This is not aesthetic mimicry. 500 million LatAm users already know Spotify's mobile UI and Netflix's desktop UI intuitively. When a student opens the app for the first time, they should know where to tap without instructions.
14. **Teacher-first build strategy.** The app is built and tested with Kyle's real students (Confident Speaker Circle / Sistema de 8) before being packaged as a consumer product. The teacher tool comes first (Phase 2), the consumer product comes later (Phase 5). Real student data drives product refinement before spending money on consumer demand testing.
15. **IPA everywhere.** The app uses IPA for all phonetic transcriptions (tooltips, dictation, choral practice, pronunciation explanations). Kyle's custom symbols (ö, ü, ä, etc.) are deprecated in the app. IPA is universally recognized, transfers to dictionaries and other courses, and Kyle's pronunciation videos already teach IPA. One system, not two. **Kyle's dialect:** use ɑ not ɔ for the open vowel in want/walk/thought-type words (`src/lib/ipa-conventions.ts`). R-colored ɔɹ (more, wore) stays separate.
16. **Same reader, different overlay.** Classroom students and consumer students use the identical story reader and activity components. The difference is context: classroom students have answer reveals gated by the teacher, oral personal questions during class, and no dictation/choral practice during class. Consumer students get everything always. Context is determined by account role and session state.
17. **Students keep their data.** When a classroom student's subscription ends, they lose access to new materials but retain access to everything from their active period: stories read, comprehension answers, vocabulary lookups, personal responses. Their study history is permanent.
18. **Lesson types transfer to the consumer tier by default.** Every classroom lesson type is built for the live Zoom class first, but designed so the same content and components also run teacher-less in the future consumer tier: the post-class review mode is the consumer blueprint. A design decision that makes a lesson classroom-only (teacher live input, group-dependent interaction) must be recorded in this PRD as a deliberate exception — the group exam's single-writer collaboration is the known example. Ratified by Kyle 2026-09-08 during the Music class design brainstorm.

---

## 3. Tech Stack

| Layer | Tool | Cost | Why |
|---|---|---|---|
| Framework | Next.js 14+ (React) | $0 | Kyle has some React knowledge. Most AI agents are deeply trained on it. |
| Database + Auth | Supabase | $0 (free tier) | PostgreSQL, built-in auth (magic link), generous free tier. |
| Payments | Stripe Billing + ThriveCart | 2.9% + 30¢ per sale | ThriveCart is the checkout. Stripe holds Customer + Subscription objects. Webhook auto-creates classroom users. Students cancel/pause in ThriveCart or Stripe. |
| Audio hosting | Vercel static files / Cloudflare R2 | $0 (free tier) | MP3 files served as static assets. No per-listen cost. |
| Hosting | Vercel | $0 (free tier) | Automatic deploys from Git, perfect for Next.js. |
| SRS algorithm | SM-2 (public domain) | $0 | Anki's algorithm. ~30 lines of code. |
| State management | TanStack Query (React Query) | $0 | Data fetching/caching. Prevents common spaghetti patterns. |
| Audio generation | Edge TTS (free) or OpenAI TTS (~$2 one-time for full library) | $0-2 one-time | Generate MP3s once, host as static files. |
| Print (future) | Paged.js or WeasyPrint | $0 | HTML/CSS → print-ready PDF. Same annotation data feeds both web and print. |

### Architecture overview

```
profekyle.com (WordPress — UNCHANGED)
    ├── Blog articles (SEO content, keeps ranking)
    ├── Marketing pages (Thrive Themes)
    └── Links to app ↓

learn.profekyle.com (new Next.js app)
    ├── /free-story — one free story, no signup (demand test)
    ├── /login — Supabase Auth (magic link, both classroom + consumer)
    ├── /dashboard — role-aware:
    │     ├── classroom student → sees courses + assignments
    │     ├── consumer student → sees library + progress
    │     └── teacher → sees class list
    ├── /lesson/[slug] — the lesson player (stories, dialogues, Movie Talk, music, translation)
    │     └── ?session=abc123 — session context (classroom mode)
    │     └── /story/[slug] redirects here so old Zoom links still work
    ├── /writing — writing class (identical overlay model)
    │     └── ?session=abc123 — live timer + submit; after class, correction view
    ├── /exam — group exam / review class (virtual handout replacing Google Docs)
    │     └── ?session=abc123 — group-based submission; review mode after class
    ├── /teacher — teacher's course list (teachers only)
    ├── /teacher/classes/[id] — course detail: roster, sessions, attendance
    ├── /teacher/classes/[id]/sessions/[sessionId] — session detail: per-student completion
    ├── /teacher/classes/[id]/students/[studentId] — student detail: full interaction data
    ├── /library — all stories (Phase 5, consumer paid tier)
    ├── /review — SRS flashcard review (Phase 5)
    ├── /sounds — pronunciation sound videos library (deferred after Phase 2.5; same SoundVideo rows)
    ├── /pronunciation — production practice with Azure (Phase 3)
    └── /progress — student progress dashboard (Phase 4)
```

---

## 4. Data Structure

> Designed before any UI. Features change; data structure is permanent.
> NOTE: Kyle's custom phonetic symbols (ö, ü, ä, etc.) are deprecated in the app. All phonetic_transcription fields use IPA. The custom symbols remain in source story files and Kyle's teaching materials, but the app displays IPA exclusively.

### Catalog map (stories vs lessons)

There is no `lessons` table. Students open `/lesson/[slug]`. The row still lives in `stories`. Do not rename that table. `story_id` everywhere is a foreign key to `stories`.

| What the student does | Postgres table | How you tell them apart | Public URL |
|---|---|---|---|
| Cuento, diálogo, Movie Talk, canción | `stories` | `kind`: `story` / `dialogue` / `movie_talk` / `song`. Session types are their own values since Slice 62 (`story` / `dialogue` / `movie_talk` / `song`). | `/lesson/[slug]` |
| Traducción (Class 3 video summary) | `stories` | `kind`: `video_summary`. Session type is `video_summary`. Teacher chrome: Traducción. | `/lesson/[slug]` |
| Presentación (Class 3 presentation) | `presentation_prompts` | Session type is `presentation`. Teacher chrome: Presentación. | `/presentation?session=` |
| Conversación (Class 4) | `conversation_prompts` | Session type is `conversation`. Teacher chrome: Conversación. Students never type. | `/conversation?session=` |
| Escritura | `writing_prompts` | Session type `writing`. | `/writing?session=` |
| Examen | `exam_prompts` | Session type `exam`. | `/exam?session=` |

`ContentTag.content_type` is `"story"` for every row in `stories`, including songs and Traducción. Writing and exams use `"writing_prompt"` and `"exam_prompt"`. Legacy `/story/[slug]` redirects to `/lesson/[slug]`.

Loader: `src/lib/stories.ts`. Types: `src/types/index.ts` (`Story`, `StoryKind`). Path helper: `lessonPath()` in `src/lib/activities.ts`.

### Check-answer abuse protection (Audit Fix 1, not a feature slice)

`/api/check-answer` requires a verified Supabase user. Missing/invalid sessions return 401. The answer must be a string of at most 500 characters. Correction prompts and successful responses are unchanged.

`check_answer_rate_limits` is server-only infrastructure:
- `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.
- `request_times timestamptz[] NOT NULL DEFAULT '{}'`: at most 10 admitted request timestamps. No question, answer, or other student content is stored.
- RLS enabled; no student/anon policies or grants. Only the service role can read/write rows or execute `consume_check_answer_request(uuid)`.
- One atomic RPC locks the user's row, drops timestamps at least one hour old, and appends the current database time only when fewer than 10 remain. This implements a rolling hour across serverless instances, including concurrent requests. Valid requests reserve a slot before OpenRouter; upstream failures still consume that slot. Invalid input consumes no slot. Database failures fail closed with 500; exhausted quota returns 429.
- Apply `supabase/migrations/20260920000000_check_answer_rate_limits.sql` before deploying the route. No new external service or environment variables. See ADR 013.

### Schema migrations (Audit Fix 2, not a feature slice)

`supabase/migrations/20260921035119_baseline_existing_schema.sql` is a schema-only dump of the live database as of 2026-09-21 (43 public tables including `stories`, `courses`, `exam_prompts`, `presentation_prompts`, `word_flags`, `song_lyric_attempts`; RLS enabled on each). It is a baseline capture, not a schema change; mark it applied with `supabase migration repair` rather than `db push`. Loose `supabase/schema-*.sql` files remain as historical documentation and are not migration history. ALL new schema changes go through `supabase/migrations/` with `supabase migration new`. New loose `schema-*.sql` files are a build-discipline violation.

### Teacher lib modules (Audit Fix 3, not a feature slice)

`src/lib/teacher.ts` is a barrel. Implementation lives in `src/lib/teacher/sessions.ts`, `groups-students.ts`, `analytics.ts`, and `attendance.ts`. Existing `@/lib/teacher` imports stay valid. `src/lib/teacher-month.ts` stays its own module. Pure move: no signature or behavior changes.

### Core entities

```
Story
  ├── id (uuid)
  ├── title (string)
  ├── slug (string, URL-safe)
  ├── level (enum: "beginner" | "pre-intermediate" | "intermediate")
  ├── kind (enum: "story" | "dialogue" | "movie_talk" | "song" | "video_summary" — default "story"; display only. ContentTag.content_type stays "story" for all five)
  ├── cefr (string, e.g. "A2/B1")
  ├── body_text (text — the full story text, plain text)
  ├── body_html (text — the story with word spans, generated from annotation)
  ├── word_count (integer)
  ├── is_free (boolean — true for the one free demo story)
  ├── youtube_url (string, nullable — songs and video summaries: YouTube clip URL)
  ├── lyric_blanks (jsonb — songs only: array of {id, prompt, answer}. 8-10 fill-in items for listening)
  ├── artist_bio (text, nullable — songs only, Slice 63: 2-3 paragraph artist mini-bio, Step 0 of the music lesson. Annotated with the same Spanish/IPA word tooltips as lyrics and story text; the words table gains a source discriminator ('body' | 'bio') so bio annotation and lyric annotation never wipe each other)
  ├── song_meaning (text, nullable — songs only, Slice 63: Kyle's teacher-authored explanation of what the song means: meaning, poetry, cultural context. NEVER AI-generated. Unlocked after the blanks step; visible in review and consumer modes)
  ├── lyrics_ipa (jsonb, nullable — songs only, Slice 63: array of {line_index, ipa_text}, the Truquitos connected-speech IPA overlay per lyric line. AI-drafted from the CLEAN lyrics (never parsed from Kyle's deck notation — disambiguation is impossible), then corrected/approved by Kyle in the Slice 55 editor)
  ├── line_timestamps (jsonb, nullable — songs only, Slice 63: array of {line_index, start_seconds, end_seconds} against the OFFICIAL VIDEO's clock — the same YouTube embed the class plays. Ratified primary generator (2026-09-09): Hermes-side tap-to-align tool `scripts/tap-align-lyrics.html` (teacher taps each line while the official video plays; timestamps the exact clock the class hears — no MP3, no offset math). Fallback: Whisper line-align on a Kyle-supplied studio MP3 for songs too dense to tap. NO karaoke_offset_seconds column — any offset bakes into the stored JSON at generation time (one timing truth). line_index is the shared 0-based non-empty-line index (`indexedLyricLines()`), same key space as lyrics_ipa. Drives karaoke highlight, auto-scroll, and per-line seek-back. Official music-video YouTube URLs only — live versions desync)
  ├── spanish_summary (text, nullable — video summaries only: Kyle's edited, English-structured Spanish translation of body_text. Displayed paragraph by paragraph during the translation activity)
  ├── free_write_minutes (integer, nullable — video summaries only: timed free writing sprint length, default 5)
  ├── synopsis (text, nullable — movie talk only, Slice 64: 2-4 sentence movie synopsis shown on the Sinopsis step)
  ├── warmup_question (text, nullable — movie talk only, Slice 64: optional; the Warm-up step exists only when this is non-empty)
  ├── learning_path (string, nullable — e.g. "pre_intermediate_stories")
  ├── sequence_order (integer, nullable)
  ├── estimated_minutes (integer, nullable)
  ├── theme (string, nullable)
  ├── language_functions (string[], nullable — e.g. "talking_about_the_past")
  ├── created_at (timestamp)
  └── updated_at (timestamp)

Word
  ├── id (uuid)
  ├── story_id (uuid, FK → Story)
  ├── position (integer — word order within the story)
  ├── text (string — the English word as it appears)
  ├── lemma (string — base form, e.g. "went" → "go")
  ├── spanish_translation (string — best translation in context)
  ├── phonetic_transcription (string — IPA, e.g. "/ðə/")
  ├── part_of_speech (string)
  ├── audio_url (string — path to MP3, /audio/words/[id].mp3)
  ├── expression_id (uuid, nullable, FK → Expression — if part of multi-word expression)
  ├── is_transparent (boolean — word doesn't need translation, e.g. "pizza")
  └── source (text, default 'body', CHECK ('body','bio') — Slice 63: lyric/story words vs artist bio words so re-annotation of lyrics cannot wipe bios)

Expression (multi-word units)
  ├── id (uuid)
  ├── story_id (uuid, FK → Story)
  ├── text (string — full expression, e.g. "pull the wool over my eyes")
  ├── spanish_translation (string)
  ├── explanation (text — what it means, why it's used)
  └── word_ids (uuid[] — ordered list of Word IDs that form this expression)

StoryAudio
  ├── id (uuid)
  ├── story_id (uuid, FK → Story)
  ├── audio_url (string — path to full-story MP3)
  ├── voice (string — "kyle" | "edge-tts" | "openai-tts")
  └── duration_seconds (integer)

StoryAudioToken
  ├── id (uuid)
  ├── story_audio_id (uuid, FK → StoryAudio)
  ├── word_id (uuid, FK → Word)
  ├── position (integer — token order within the audio)
  ├── start_ms (integer)
  └── end_ms (integer)

ComprehensionQuestion
  ├── id (uuid)
  ├── story_id (uuid, FK → Story)
  ├── position (integer — question order)
  ├── question (text)
  ├── answer (text — included for pre-int self-study; null for intermediate; movie talk: the deck answer, or the seed-time AI draft when the deck has none — flagged, teacher-reviewed)
  └── level (enum: "factual" | "inferential")

MovieTalkScene (one row per scene; Slice 64 — the scene's clip + question range. The transcript itself lives in `stories.body_text`, not here: one `Name-Dialogue` line per turn, scenes separated by a `***` line — the exact format Slice 62's reader already renders ("Escena N" dividers) and the annotation/flags/tooltips anchor to. Scene rows add the clip data the reader doesn't have)
  ├── id (uuid)
  ├── story_id (uuid, FK → Story, ON DELETE CASCADE)
  ├── scene_number (integer — 1-based order; must match the order of `***`-separated scenes in body_text)
  ├── youtube_url (text, nullable — the scene clip; null renders the graceful "clip no disponible" state, the rest of the lesson works)
  ├── start_seconds (integer, nullable — the deck's `&t=` offset; the synced embed seeks here on load)
  ├── end_seconds (integer, nullable — auto-pause point at the scene's end; null = play to the end of the clip)
  ├── question_start_position (integer, nullable — first ComprehensionQuestion.position belonging to this scene)
  └── question_end_position (integer, nullable — last ComprehensionQuestion.position belonging to this scene; null range = scene has no questions)
  UNIQUE (story_id, scene_number)

Scene questions: reuse ComprehensionQuestion (FK to the same story). The seed assigns `position` so each scene's questions group contiguously (scene 1's questions first, then scene 2's...). The step builder slices them per scene via the per-scene ranges on the rows. The reader's speaker regex gains the movie-talk format: `Name-` at line start renders as a styled speaker name (terracotta label, same as dialogue), is excluded from word-annotation anchoring, and is the character-band's matching key; `Name:` (dialogue format) continues to work unchanged.

PersonalQuestion
  ├── id (uuid)
  ├── story_id (uuid, FK → Story)
  ├── position (integer)
  └── question (text)

DictationPrompt
  ├── id (uuid)
  ├── story_id (uuid, FK → Story)
  ├── position (integer)
  ├── source_type (enum: "practica_coral" | "story_sentence" — practica_coral uses the story's existing Práctica Coral sentence)
  ├── standard_text (text — the sentence in standard spelling, withheld until learner submits attempt)
  ├── phonetic_text (text — the phonetically respelled version, used as the scoring matrix)
  ├── start_ms (integer, nullable — excerpt start in StoryAudio, for audio playback)
  ├── end_ms (integer, nullable — excerpt end in StoryAudio)
  ├── error_taxonomy (jsonb — pre-authored error labels per word/segment: "unknown_word" | "word_boundary" | "reduced_form" | "sound_contrast" | "stress" | "missed_detail")
  ├── explanation (text — one-sentence Spanish explanation in Kyle's voice, pre-authored)
  └── created_at (timestamp)

DictationAttempt
  ├── id (uuid)
  ├── user_id (uuid, FK → User, nullable for anonymous free-story session)
  ├── session_id (string, nullable — anonymous free-story session)
  ├── dictation_prompt_id (uuid, FK → DictationPrompt)
  ├── attempt_number (integer)
  ├── response_text (text — what the learner typed)
  ├── error_analysis (jsonb, nullable — word-by-word comparison against standard_text, cross-referenced against phonetic_text)
  ├── transcript_revealed_at (timestamp, nullable)
  ├── submitted_at (timestamp)
  └── completed_at (timestamp, nullable)

ReverseTranslationPrompt
  ├── id (uuid)
  ├── story_id (uuid, FK → Story)
  ├── position (integer)
  ├── english_text (text — the original English sentence)
  ├── spanish_reference (text — Kyle's Spanish translation of the sentence)
  ├── prompt_type (enum: "key_sentence" | "practica_coral" | "twist_line")
  └── created_at (timestamp)

ReverseTranslationAttempt
  ├── id (uuid)
  ├── user_id (uuid, FK → User, nullable for anonymous free-story session)
  ├── session_id (string, nullable)
  ├── reverse_translation_prompt_id (uuid, FK → ReverseTranslationPrompt)
  ├── forward_translation (text — learner's L2 to L1 translation, Step 2)
  ├── forward_submitted_at (timestamp)
  ├── reverse_translation (text, nullable — learner's L1 to L2 reconstruction, Step 3, after 24-48h delay)
  ├── reverse_submitted_at (timestamp, nullable)
  ├── comparison_viewed_at (timestamp, nullable — when learner saw the original English text for comparison)
  └── completed_at (timestamp, nullable)

PersonalResponse
  ├── id (uuid)
  ├── user_id (uuid, FK → User, nullable for anonymous free-story session)
  ├── session_id (string, nullable)
  ├── personal_question_id (uuid, FK → PersonalQuestion)
  ├── response_text (text, nullable)
  ├── response_audio_url (string, nullable — Phase 3)
  ├── attempt_number (integer)
  ├── feedback_json (jsonb, nullable — structured formative feedback from AI)
  ├── submitted_at (timestamp)
  └── revised_from_id (uuid, nullable, FK → PersonalResponse — links a revision to the original attempt)

MicroExplanation
  ├── id (uuid)
  ├── activity_type (enum: "dictation" | "reverse_translation" | "story_audio" | "comprehension" | "personal_questions" | "tprs_circling" | "pronunciation" | "video_summary_free_write" | "video_summary_translation")
  ├── text (text — one or two sentences in Spanish, Kyle's voice)
  ├── research_ref (string, nullable — wiki page name for the underlying research, e.g. "dictation-and-dictogloss-research")
  ├── display_count (integer, default 1 — how many times to show before suppressing)
  └── created_at (timestamp)

PronunciationDrill
  ├── id (uuid)
  ├── story_id (uuid, FK → Story)
  ├── symbol_legend (text — the ö/ü/ä/ör block, or null if using a different focus)
  ├── focus_type (enum: "sounds" | "ed-s-rules" | "emphasized-syllable")
  ├── focus_content (text — the specific drill content for this story)
  ├── practica_coral_standard (text — sentence in standard spelling)
  ├── practica_coral_phonetic (text — Kyle's respelling, for source files and teaching materials)
  ├── practica_coral_ipa (text — student-facing IPA of the Práctica Coral sentence)
  ├── word_notes (jsonb — [{ word, note }] Kyle's word-by-word pronunciation notes, shown after dictation)
  └── coral_audio_url (string — path to the Práctica Coral MP3)

ChoralPracticeCompletion
  ├── id (uuid)
  ├── user_id (uuid, FK → User)
  ├── story_id (uuid, FK → Story)
  ├── rounds_completed (integer — 5 = full practice)
  └── completed_at (timestamp)

User
  ├── id (uuid)
  ├── email (string, unique)
  ├── role (enum: "student-classroom" | "student-consumer" | "teacher")
  ├── stripe_customer_id (string, nullable — links to Stripe for subscription management)
  ├── subscription_status (enum: "active" | "cancelled" | "paused" | "none" — "none" for consumer lifetime buyers)
  ├── purchased (boolean — has paid $47 lifetime, consumer only)
  ├── purchased_at (timestamp, nullable)
  ├── classroom_level (enum: "pre-intermediate" | "intermediate" | null — teacher-assigned live Zoom group. Stripe price seeds this only when null. Teacher move always wins. New monthly courses auto-enroll from this field, not from the ThriveCart price.)
  └── created_at (timestamp)

SubscriptionPeriod (tracks active subscription windows for material access)
  ├── id (uuid)
  ├── user_id (uuid, FK → User)
  ├── stripe_subscription_id (string)
  ├── started_at (timestamp)
  ├── ended_at (timestamp, nullable — null means currently active)
  └── status (enum: "active" | "cancelled" | "paused")

Course (a group of students in the Confident Speaker Circle / Sistema de 8)
  ├── id (uuid)
  ├── name (string — "Inglés Intermedio" or "Inglés Pre-Intermedio")
  ├── level (enum: "pre-intermediate" | "intermediate")
  ├── teacher_id (uuid, FK → User)
  ├── created_at (timestamp)
  ├── archived (boolean — for courses that ended)
  ├── zoom_url (string, nullable — monthly Zoom room for this group. Same URL for all 8 sessions. Students and teacher open it from the class-day join card.)
  └── theme (string, nullable — optional monthly theme shown as one subtitle on teacher cards and student Lecciones headings. Slice 60. Omit the line when empty.)

CourseEnrollment
  ├── id (uuid)
  ├── course_id (uuid, FK → Course)
  ├── student_id (uuid, FK → User)
  ├── enrolled_at (timestamp)
  └── display_name (string — what the teacher calls them: "Sofia G.")

CourseSession (one class meeting, one catalog activity assigned)
  ├── id (uuid)
  ├── course_id (uuid, FK → Course)
  ├── session_type (enum: "story" | "writing" | "exam" | "video_summary" | "presentation" | "conversation" | "pronunciation" | "dialogue" | "movie_talk" | "song" | "flex" — presentation uses presentation_prompt_id; conversation uses conversation_prompt_id (Slice 61); pronunciation remains live-only, no prompt FK, no story_id (Slice 65: Nueva clase can create it); dialogue/movie_talk/song point at story_id with the matching Story.kind since Slice 62, but generated empty rows may have story_id null until assigned (Slice 60); flex is the unresolved Class 3 slot, all FKs null, live-only until resolved)
  ├── story_id (uuid, FK → Story, nullable — set for story / dialogue / movie_talk / song / video_summary once content is assigned; generated empty rows may be null until Elegir contenido)
  ├── writing_prompt_id (uuid, FK → WritingPrompt, nullable — required when session_type is "writing")
  ├── exam_prompt_id (uuid, FK → GroupExamPrompt, nullable — required when session_type is "exam")
  ├── presentation_prompt_id (uuid, FK → PresentationPrompt, nullable — required when session_type is "presentation")
  ├── conversation_prompt_id (uuid, FK → ConversationPrompt, nullable — required when session_type is "conversation"; Slice 61)
  ├── **dialogue** sessions (Slice 62): session_type = "dialogue", story_id set where stories.kind = "dialogue". Reuses the story lesson path (`/lesson/[slug]`), reader session type, and label "Diálogo" — no conversation_prompt_id, no new FK. Mirrors how video_summary reuses story_id.
  ├── round_current (integer, default 0 — conversation sessions only: which 4-4-4 round is active, 0 = before round 1, 7 = all rounds done. Teacher-driven via "Siguiente ronda")
  ├── round_state (text, default 'idle' — conversation sessions only: 'idle' | 'running' | 'stopped'. Teacher starts/stops the round timer)
  ├── round_started_at (timestamptz, nullable — when the teacher started the current round; students compute the countdown from this + round length derived from their course level)
  ├── session_date (date)
  ├── session_start_time (timestamp — when the 90-min class window opens)
  ├── session_end_time (timestamp — session_start_time + 90 min; scheduled end, not the teaching-mode cutoff)
  ├── class_ended_at (timestamp, nullable — teacher taps Terminar clase. Review mode starts then. If still null four hours after session_end_time, teaching mode ends on its own.)
  ├── answers_revealed (boolean, default false — story sessions only; auto-flips to true when class_ended_at is set, or at the overtime cap)
  ├── timer_started_at (timestamp, nullable — writing sessions: set when teacher clicks "Iniciar", synced via Supabase Realtime. Lives on the session so the same prompt can be reused.)
  ├── video_playing (boolean, default false — classroom YouTube: teacher is playing. Students follow while teaching mode is on.)
  ├── video_seconds (real, default 0 — classroom YouTube playhead in seconds)
  ├── video_rate (real, default 1 — classroom YouTube playback rate)
  ├── video_updated_at (timestamp, nullable — last teacher play/pause/seek)
  ├── lesson_step_current (text, nullable — teacher-paced lessons, Slice 63: the step the teacher is on; students in live classroom mode are locked to at most this step. Presentation uses its own presentation_step encoding; music uses 'bio' | 'video' | 'blind_listen' | 'blanks' | 'lyrics_meaning' | 'truquitos_karaoke'. The pattern generalizes to every step-based lesson type — PRD Kyle's Rules #17)
  ├── lesson_step_locked (boolean, default false — Slice 63: when true, live-classroom students cannot navigate past lesson_step_current (back-viewing earlier steps stays allowed). Review mode and consumer mode are always free-navigate. Teacher toggles it from the song lesson page, not the session page)
  ├── song_class_answers (jsonb, default {} — Slice 63: live teacher-typed answers for song blanks, keyed by blank id. Student submissions stay in song_lyric_attempts. When the teacher starts typing a blank, student phones replace that blank's on-screen text with the teacher's text.)
  ├── movie_talk_class_answers (jsonb, default {} — Slice 64: live teacher-typed answers for movie talk questions, keyed by question position. Student typed answers stay in comprehension_responses. Realtime-pushed to phones; no Listo button.)
  ├── notes (text, nullable — teacher's instructions to students)
  ├── session_link_token (string — unique token for the Zoom chat link)
  ├── recording_youtube_url (text, nullable — YouTube recording pasted by the teacher after class)
  └── created_at (timestamp)
  CHECK: story sessions have no writing/exam/presentation/conversation prompt FKs (`story_id` may be null until assigned); writing sessions have writing_prompt_id and no story_id/exam_prompt_id/presentation_prompt_id; exam sessions have exam_prompt_id and no story_id/writing_prompt_id/presentation_prompt_id; video_summary sessions have no writing/exam/presentation/conversation prompt FKs; presentation sessions have presentation_prompt_id and no story_id/writing_prompt_id/exam_prompt_id; dialogue/movie_talk/song sessions (Slice 62/60) have no writing/exam/presentation/conversation prompt FKs (`story_id` may be null on generated empty rows); pronunciation and flex have all content FKs null. One session, one activity. (`course_sessions_session_type_check` and `course_sessions_activity_check`; Slice 60 added `flex` and dropped `story_id IS NOT NULL` on dialogue/movie_talk/song.)

WritingPrompt (catalog content, reusable for live class and later self-study)
  ├── id (uuid)
  ├── title (string — short label for the teacher list)
  ├── prompt_text (text — the question/prompt students respond to)
  ├── writing_time_minutes (integer — 20 for intermediate, 10 for pre-intermediate)
  ├── level (enum: "pre-intermediate" | "intermediate")
  ├── structure_lesson (text, nullable — intermediate only, shown on the Ejemplo step above the sample)
  ├── rubric_text (text, nullable — intermediate only, TOEFL/IELTS rubric, display-only, no numeric score)
  ├── example_paragraph (text, nullable — both levels, shown on the Ejemplo step)
  ├── created_by (uuid, FK → User)
  └── created_at (timestamp)

SessionAttendance
  ├── id (uuid)
  ├── course_session_id (uuid, FK → CourseSession)
  ├── student_id (uuid, FK → User)
  ├── attended (boolean — true if the student clicked the session link while teaching mode is on, or if the teacher marked them present)
  └── first_opened_at (timestamp, nullable — when the student first clicked the link. Null if the teacher marked attendance and the student never opened)

ComprehensionResponse
  ├── id (uuid)
  ├── user_id (uuid, FK → User)
  ├── comprehension_question_id (uuid, FK → ComprehensionQuestion)
  ├── course_session_id (uuid, nullable, FK → CourseSession — links to the class session if classroom student)
  ├── response_text (text — what the student typed)
  ├── revealed_answer (boolean — did they click "Ver respuesta" / was it auto-revealed in review mode)
  ├── revealed_at (timestamp, nullable)
  └── submitted_at (timestamp)

WordLookup (tracks which words students tap for translation)
  ├── id (uuid)
  ├── user_id (uuid, FK → User)
  ├── word_id (uuid, FK → Word)
  ├── story_id (uuid, FK → Story)
  ├── course_session_id (uuid, nullable, FK → CourseSession)
  └── looked_up_at (timestamp — first lookup per word per student per story; subsequent taps on same word by same student are not logged)

WritingSubmission (one student's written response)
  ├── id (uuid)
  ├── writing_prompt_id (uuid, FK → WritingPrompt)
  ├── user_id (uuid, FK → User)
  ├── course_session_id (uuid, nullable, FK → CourseSession — null reserved for future self-study)
  ├── submission_text (text — what the student wrote)
  ├── started_at (timestamp — when the timer started for this student)
  ├── submitted_at (timestamp, nullable — when student clicked submit or auto-submitted at zero)
  ├── elapsed_seconds (integer — actual writing time, for WPM calculation)
  ├── word_count (integer — computed on submit, shown for both levels)
  ├── wpm (float, nullable — word_count / elapsed_seconds * 60, pre-intermediate only)
  ├── status (enum: "draft" | "submitted" | "corrected")
  └── created_at (timestamp)

WritingCorrection (teacher's corrections on a submission)
  ├── id (uuid)
  ├── writing_submission_id (uuid, FK → WritingSubmission)
  ├── corrected_text (text — the plain text corrected version)
  ├── correction_diff (jsonb — auto-computed array of {text, type: "kept"|"added"|"deleted"} segments, using `diff` npm package word-level mode)
  ├── inline_notes (jsonb, nullable — array of {word_index, note} for inline teacher comments)
  ├── good_vocabulary (jsonb, nullable — array of word indices the teacher highlighted as good vocabulary)
  ├── corrected_by (uuid, FK → User — teacher's user id)
  └── corrected_at (timestamp)

GroupExamPrompt (catalog content, reusable for live class — the virtual handout replacing Google Docs)
  ├── id (uuid)
  ├── title (string — short label for the teacher list, e.g. "Examen Noviembre — Intermedio")
  ├── level (enum: "pre-intermediate" | "intermediate")
  ├── theme (string, nullable — the month's topic, for teacher reference)
  ├── vocabulary_list (jsonb — array of {id: int, english: string, spanish: string}. 20-22 items. The base-form English words students pick from for Task 1)
  ├── fill_in_translation (jsonb — array of {number: int, sentence: string, slots: [{spanish_word: string, expected_english: string, acceptable_variations: string[], morphological_note: string, nullable}]}. The numbered story for Task 1. Each sentence contains 1-3 Spanish words in parentheses. expected_english matches a vocabulary_list item. Morphological transformation is validated: tense, plural, etc.)
  ├── task2_type (enum: "paragraph_restructuring" | "sentence_correction" — determined by level: intermediate = paragraph_restructuring, pre-intermediate = sentence_correction. Can be overridden by teacher for edge cases)
  ├── paragraph_restructuring (jsonb, nullable — intermediate Task 2. Array of {number: int, sentence: string, correct_position: string}. 7-9 scrambled sentences. correct_position is the letter A-H indicating where it belongs. Students write the letter in a blank before each numbered sentence)
  ├── sentence_correction (jsonb, nullable — pre-intermediate Task 2. Array of {number: int, sentence: string, is_correct: boolean, corrected_version: string, nullable}. 10 sentences (7 incorrect + 3 correct), shuffled. If is_correct = true, corrected_version is null. If incorrect, corrected_version is the target English sentence)
  ├── translation_sentences (jsonb — Task 3. Array of {number: int, spanish: string, accepted_english: string[], acceptable_variations: string[]}. 10 Spanish sentences. Sentences 9-10 are conditionals (9 = 2nd conditional, 10 = 3rd conditional). accepted_english allows multiple valid translations)
  ├── time_limit_minutes (integer, default 35 — advisory, not hard cutoff. Students don't need to finish)
  ├── created_by (uuid, FK → User — teacher's user id)
  └── created_at (timestamp)

ExamGroup (one group of 2-3 students working on one exam instance together)
  ├── id (uuid)
  ├── course_session_id (uuid, FK → CourseSession — the exam session)
  ├── group_label (string — teacher-assigned label, e.g. "Grupo A", "Grupo B")
  ├── writer_id (uuid, FK → User — the designated student who submits answers for the group)
  ├── member_ids (uuid[] — all students in this group, including the writer. For attribution)
  └── created_at (timestamp)

GroupExamSubmission (one group's answers, submitted by the designated writer)
  ├── id (uuid)
  ├── exam_prompt_id (uuid, FK → GroupExamPrompt)
  ├── exam_group_id (uuid, FK → ExamGroup)
  ├── course_session_id (uuid, FK → CourseSession)
  ├── task1_answers (jsonb — array of {slot_index: int, answer: string}. One entry per Spanish word slot in the fill-in translation story)
  ├── task2_answers (jsonb — intermediate: array of {sentence_number: int, assigned_letter: string}. Pre-intermediate: array of {sentence_number: int, is_correct: boolean, corrected_text: string, nullable})
  ├── task3_answers (jsonb — array of {sentence_number: int, english_translation: string})
  ├── started_at (timestamp — when the group first opened the exam)
  ├── submitted_at (timestamp, nullable — when the writer clicked submit, or null if not submitted)
  ├── status (enum: "in_progress" | "submitted")
  ├── review_revealed_at (timestamp, nullable — when Kyle revealed correct answers for this group)
  └── created_at (timestamp)

PresentationPrompt (catalog content, reusable for live class — the virtual handout replacing Google Slides)
  ├── id (uuid)
  ├── title (string — short label for the teacher list, e.g. "Presentación: Paris")
  ├── level (enum: "intermediate" — currently intermediate only; pre-intermediate uses video summary translation)
  ├── theme (string, nullable — the month's topic, for teacher reference)
  ├── warmup_question (text, nullable — optional icebreaker displayed before the first segment)
  ├── segments (jsonb — array of segment objects, 2-3 items. Each segment:
  │     {
  │       id: int (sequential, 1-based),
  │       youtube_url: string (YouTube URL for this segment),
  │       title: string (optional label for the segment, e.g. "Part 1" or the video title),
  │       vocabulary: array of { english: string, spanish: string, example_sentence: string (nullable) }. 8-20 items. English=Spanish translation, same format as Google Slides. Example sentences use student-referenced context (nullable — only for difficult/context-dependent words).
  │       comprehension_questions: array of { id: int, question: string, answer: string }. 3-5 items. Information questions (short answer). Answer is the correct response for self-check.
  │     }
  │   )
  ├── created_by (uuid, FK → User — teacher's user id)
  └── created_at (timestamp)

PresentationResponse (one answer to one comprehension question in one session)
  ├── id (uuid)
  ├── presentation_prompt_id (uuid, FK → PresentationPrompt)
  ├── user_id (uuid, FK → User)
  ├── course_session_id (uuid, nullable, FK → CourseSession — null for future self-study
  ├── segment_id (integer — which segment within the presentation, 1-based, matching the segments array)
  ├── question_id (integer — which question within the segment, matching the comprehension_questions array)
  ├── response_text (text — what was typed)
  ├── revealed_answer (boolean — student: they clicked "Ver respuesta". Teacher row: they tapped Listo)
  ├── revealed_at (timestamp, nullable)
  └── submitted_at (timestamp)

  Teacher rows (`user_id` = the course teacher) are the live class answer. Enrolled students can SELECT those rows. During live class students do not type. After class, students write their own rows and self-check against the catalog answer.

ConversationPrompt (catalog content, Slice 61 — the virtual question sheet replacing the Google Doc for Class 4)
  ├── id (uuid)
  ├── title (string — short label for the teacher list, e.g. "Conversación: Septiembre")
  ├── level (enum: "intermediate" | "pre_intermediate" — both levels run Class 4)
  ├── theme (string, nullable — the month's topic, for teacher reference)
  ├── questions (jsonb — array of { id: int, question: string }. 3-6 questions per the methodology. Same set serves both halves: every student asks all of them (rounds 1-3) and answers all of them (rounds 4-6), so the student page has no role display. Follow-ups are verbal, not listed.)
  ├── created_by (uuid, FK → User — teacher's user id)
  └── created_at (timestamp)

  Note: no responses table. Students never type anything in Class 4 — the page is display-only (round number, countdown, questions). Attendance auto-marks from the session-link click; Slice 59 manual override covers students who never open the app. Round length is NOT stored on the prompt: it derives from the course level (pre-intermediate 4 min, intermediate 5 min).

VideoSummaryParagraph (one paragraph of the Spanish summary, with teacher's live English translation)
  ├── id (uuid)
  ├── story_id (uuid, FK → Story — where kind = "video_summary")
  ├── position (integer — paragraph order within the summary, 0-indexed)
  ├── spanish_text (text — one paragraph of Kyle's edited, English-structured Spanish)
  ├── english_translation (text, nullable — Kyle types this live during class, one paragraph at a time. Null until teacher writes. Synced to all students via Supabase Realtime.)
  ├── translation_started_at (timestamp, nullable — when teacher first typed in this paragraph's translation field)
  └── translation_completed_at (timestamp, nullable — when teacher moved to the next paragraph or clicked "Listo")

VideoSummaryFreeWrite (one student's 5-minute free writing summary of the video)
  ├── id (uuid)
  ├── story_id (uuid, FK → Story)
  ├── user_id (uuid, FK → User)
  ├── course_session_id (uuid, nullable, FK → CourseSession — null for future self-study)
  ├── submission_text (text — what the student wrote describing the video)
  ├── started_at (timestamp — when the timer started for this student)
  ├── submitted_at (timestamp, nullable — when student clicked submit or auto-submitted at zero)
  ├── elapsed_seconds (integer — actual writing time)
  ├── word_count (integer — computed on submit)
  └── created_at (timestamp)

VideoSummaryTeachingNote (teacher's inline word/phrase flags and grammar notes, created live during class)
  ├── id (uuid)
  ├── story_id (uuid, FK → Story)
  ├── course_session_id (uuid, FK → CourseSession)
  ├── paragraph_position (integer — which paragraph the note is attached to)
  ├── selected_text (string — the word or phrase Kyle highlighted in the Spanish or English text)
  ├── note (text — Kyle's quick explanation: grammar point, vocab note, "referenced in group exam", etc.)
  ├── note_type (enum: "vocabulary" | "grammar" | "pronunciation" | "cultural" — quick classification for filtering)
  ├── text_side (enum: "spanish" | "english" — which text the highlight belongs to; Spanish notes never attach to English)
  ├── created_by (uuid, FK → User — teacher's user id)
  └── created_at (timestamp)

WordFlag (teacher's persistent per-content mark — bold/underline — on a word in the lesson text; Slice 62, ADR 009)
  ├── id (uuid)
  ├── story_id (uuid, FK → Story, ON DELETE CASCADE)
  ├── flag_type (enum: "underline" | "bold" — underline = model pronunciation (heard live during the read), bold = explain meaning (prep-time predicted comprehension blocker))
  ├── flag_text (text — the token as it appears in body_text, matching the reader tokenization)
  ├── occurrence_index (integer — 0-based count of this token in the body_text tokenization; NOT a word_id. The words table is wiped on re-annotation, so text+occurrence is the durable anchor)
  ├── note (text, nullable — Slice 64 amends ADR 009's mark-only v1: Kyle's explanation for a flagged word, written like the writing class notes. Students tap a noted flagged word → centered lightbox with the note. The note column serves all text-centric kinds: story, dialogue, movie talk)
  ├── created_at (timestamptz)
  └── UNIQUE(story_id, flag_text, occurrence_index, flag_type) — one flag per anchor per type; the note field was added by Slice 64 (amending ADR 009's mark-only v1); no course_session_id (per-content, not per-class)

WordFlagRequest (student's "No entendí" signal on a word — Slice 62; per-student, session-scoped live classroom signal, never mutating the shared text)
  ├── id (uuid)
  ├── story_id (uuid, FK → Story, ON DELETE CASCADE)
  ├── course_session_id (uuid, FK → CourseSession, ON DELETE CASCADE — session-scoped: the badge count means "N students in THIS class asked")
  ├── user_id (uuid, FK → auth.users, ON DELETE CASCADE)
  ├── flag_text (text — the token as it appears in body_text, same anchor convention as WordFlag)
  ├── occurrence_index (integer — same anchor convention as WordFlag)
  ├── created_at (timestamptz)
  └── UNIQUE(course_session_id, user_id, flag_text, occurrence_index) — one request per student per anchor per class; students see only their own; teacher sees the aggregated count badge live

SongLyricAttempt (student's answer to one lyric blank — the live worksheet record; Slice 63)
  ├── id (uuid)
  ├── course_session_id (uuid, FK → CourseSession, ON DELETE CASCADE — session-scoped: the in-class attempt is the scored record)
  ├── user_id (uuid, FK → auth.users, ON DELETE CASCADE)
  ├── story_id (uuid, FK → Story, ON DELETE CASCADE)
  ├── blank_id (integer — matches the lyric_blanks array item id)
  ├── typed_text (text, nullable — autosaved continuously while unsubmitted; a refresh never loses work)
  ├── is_correct (boolean, nullable — null until submitted; set at submit by case/whitespace-insensitive comparison against the blank answer)
  ├── submitted_at (timestamptz, nullable — null = still typing; set once by "Entregar respuestas", which freezes the row)
  ├── updated_at (timestamptz)
  └── UNIQUE(course_session_id, user_id, blank_id) — one row per blank per student per class; review/consumer fresh passes are NOT persisted in v1 (local state only — the in-class attempt stays the single scored record)

MusicAnalytics (derived, not stored — per-blank difficulty = miss rate grouped by blank_id over submitted attempts; per-student score = count of is_correct per user. Rendered on the teacher session page for music sessions. No new table.)

SRSCard
  ├── id (uuid)
  ├── user_id (uuid, FK → User)
  ├── word_id (uuid, FK → Word)
  ├── interval (integer — days until next review)
  ├── ease_factor (float — SM-2 ease, starts at 2.5)
  ├── repetitions (integer — successful reviews)
  ├── next_review_date (date)
  ├── last_reviewed_at (timestamp, nullable)
  └── created_at (timestamp)

UserProgress
  ├── id (uuid)
  ├── user_id (uuid, FK → User)
  ├── story_id (uuid, FK → Story)
  ├── status (enum: "not-started" | "in-progress" | "completed")
  ├── comprehension_score (float, nullable — % correct)
  ├── started_at (timestamp, nullable)
  └── completed_at (timestamp, nullable)

UserHighlight
  ├── id (uuid)
  ├── user_id (uuid, FK → User)
  ├── story_id (uuid, FK → Story)
  ├── word_start (integer — character position)
  ├── word_end (integer — character position)
  ├── color (string — highlight color)
  ├── note (text, nullable — user's personal note on this highlight)
  └── created_at (timestamp)
```

### Knowledge graph tags (Phase 4 — content-type-aware, not story-locked)

The tags themselves are about language, not stories. A writing prompt, a song, a Movie Talk, or an exam can all hit "present perfect." The junction is polymorphic so any content type can be tagged without schema change. Stories are the first content type; others plug in later.

```
GrammarTag
  ├── id (uuid)
  ├── name (string, e.g. "past_simple_regular", "present_perfect")
  ├── display_name (string, e.g. "Past Simple (Regular Verbs)")
  └── prerequisites (uuid[] — other GrammarTag IDs)

VocabularyTag
  ├── id (uuid)
  ├── name (string, e.g. "transport", "family")
  └── display_name (string)

PhoneticTag
  ├── id (uuid)
  ├── name (string, e.g. "ed_endings_voiceless", "th_unvoiced")
  └── display_name (string)

ContentTag (polymorphic junction — replaces StoryTag)
  ├── content_type (enum: "story" | "writing_prompt" | "exam_prompt")
  ├── content_id (uuid — polymorphic, no FK; app-layer validates against the right table)
  ├── tag_type (enum: "grammar" | "vocabulary" | "phonetic")
  ├── tag_id (uuid, FK → GrammarTag | VocabularyTag | PhoneticTag)
  ├── coverage_level (enum: "introduced" | "reinforced" | "mastered")
  └── UNIQUE (content_type, content_id, tag_type, tag_id)

UserTopicEvidence (current-state row, one per student per topic)
  ├── id (uuid)
  ├── user_id (uuid, FK → User)
  ├── tag_type (enum: "grammar" | "vocabulary" | "phonetic")
  ├── tag_id (uuid, FK → GrammarTag | VocabularyTag | PhoneticTag)
  ├── status (enum: "seen" | "practiced" | "needs_more_practice")
  ├── source_type (enum: "reading" | "word_lookup" | "comprehension" | "personal_response" | "dictation" | "pronunciation" | "writing" | "exam")
  ├── source_id (uuid, nullable — points to the specific session/submission/activity that produced the signal)
  ├── evidence_detail (jsonb — error patterns, scores, specifics from the latest source)
  └── updated_at (timestamp)
  UNIQUE (user_id, tag_type, tag_id)

DictationAttempt (keyed to pronunciation_drills, not a separate prompt catalog)
  ├── id (uuid)
  ├── user_id (uuid, FK → User)
  ├── story_id (uuid, FK → Story)
  ├── pronunciation_drill_id (uuid, FK → PronunciationDrill, nullable)
  ├── response_text (text)
  ├── accuracy (float, nullable — share of words matched, practice guidance only)
  ├── error_analysis (jsonb, nullable)
  └── submitted_at (timestamp)

PronunciationAttempt (logged-in only; anonymous stays in-session)
  ├── id (uuid)
  ├── user_id (uuid, FK → User)
  ├── story_id (uuid, FK → Story, nullable)
  ├── pronunciation_drill_id (uuid, FK → PronunciationDrill, nullable)
  ├── reference_text (text)
  ├── accuracy_score / fluency_score / completeness_score (float, nullable — Azure practice guidance, never a CEFR or official score)
  ├── weak_sounds (string[] — IPA symbols scored low)
  └── created_at (timestamp)
```

**Evidence grain — current-state, not event log:**
- One row per student per topic. Latest source overwrites. This is the right grain for N+1 routing (you need current status, not history).
- **Status transition rule:** the activity that produced the evidence computes the new status based on its outcome.
  - "seen" → student encountered the topic (read a story containing it, looked up a word).
  - "practiced" → student completed an activity on this topic with a positive signal (comprehension correct, dictation clean, pronunciation scored well).
  - "needs_more_practice" → student struggled (dictation errors on a phonetic tag, comprehension wrong on a grammar tag).
  - **"needs_more_practice" is sticky** — it can only be cleared by a subsequent *practice* activity with a positive signal, not by passive "reading." If a student fails dictation on "ed_endings_voiceless," reading another story doesn't clear it. They need a successful pronunciation or dictation activity.

**source_type vs content_type — different dimensions:**
- `content_type` (on `ContentTag`) is the **catalog item**: what kind of content is tagged (story, writing_prompt, exam_prompt).
- `source_type` (on `UserTopicEvidence`) is the **activity that produced the signal**: reading, word_lookup, comprehension, personal_response, dictation, pronunciation, writing, exam.
- These are intentionally different axes. A dictation miss is `source_type = "dictation"`, not `"story"`. The activity tells you *how* you got the signal; the session tells you *which content* it came from.
- "story" does NOT appear in `source_type`. It was removed to avoid confusion with `content_type`. Passive exposure from reading is `source_type = "reading"`. Tapping a word is `source_type = "word_lookup"`.

**Dialogues, Movie Talks, songs, and video summaries: Story rows with a kind field:**
- See **Catalog map** at the start of this section. Same rule: reader-backed content stays in `stories`; writing and exams stay in their own tables.
- Dialogues, Movie Talks, songs, and video summaries share annotation infrastructure (Word, Expression, tooltips, audio) with stories. They are stored as `Story` rows with `kind`: `"story" | "dialogue" | "movie_talk" | "song" | "video_summary"` (default `"story"`).
- `ContentTag.content_type` for all five is `"story"` — the kind field distinguishes display, not tagging.
- Songs add `youtube_url` and `lyric_blanks` on the same Story row (YouTube clip + 8-10 listening blanks). No separate song catalog table.
- Video summaries add `youtube_url`, `spanish_summary`, and `free_write_minutes` on the same Story row. The Spanish summary is split into paragraphs stored in `VideoSummaryParagraph` rows (one row per paragraph, with the teacher's live English translation field). No separate video summary catalog table.
- `WritingPrompt`, `GroupExamPrompt`, `PresentationPrompt`, and `ConversationPrompt` are separate tables (different shape, no annotation). They get `content_type = "writing_prompt"`, `"exam_prompt"`, `"presentation_prompt"`, and `"conversation_prompt"` respectively, with `content_id` pointing to their own tables. The exam catalog table is `exam_prompts`, the presentation catalog table is `presentation_prompts`, the conversation catalog table is `conversation_prompts`.

**What does NOT change:**
- `Word`, `WordLookup`, `ComprehensionQuestion`, `PersonalQuestion`, `PronunciationDrill`, `DictationPrompt` all FK to `Story` — correct. They are the reader schema, shared with dialogues, Movie Talks, songs, and video summaries via `Story.kind`.
- `CourseSession` already polymorphic (`session_type` + nullable FKs). Dialogue, Movie Talk, music, and video summary stay `session_type = "story"` (or `\"video_summary\"` for video summary) plus `story_id`. Exam is `session_type = "exam"`. Presentation is `session_type = "presentation"` plus `presentation_prompt_id`. Conversation is `session_type = "conversation"` plus `conversation_prompt_id` and the round fields (`round_current`, `round_state`, `round_started_at`). Pronunciation remains live-only with no prompt FK (Slice 65: creatable in Nueva clase; Class 1 story dictado/coral/pronunciación unlock for students at the pronunciation session's `session_start_time`). Update 2026-09-08: dialogue, movie_talk, and song became their own session_type values in Slice 62 (they previously rode "story" — see the CourseSession CHECK); Slice 63 adds music pacing fields (lesson_step_current, lesson_step_locked) on song sessions.
- Do not unify writing prompts or exams into the `Story` table. They share tags and evidence, not the reader schema.

---

## 5. Input Material Formats

> Each level has different source material. The annotation pipeline must handle all three.

### Beginner (E4L1-style) — Phase 2

- Sentence-by-sentence structure
- Very short, simple sentences (15-20 words max)
- Present simple, past simple, basic "going to" future
- Mandatory contractions
- Layout: likely carousel/swipe, one sentence at a time (UI TBD in Phase 2)
- Annotation: per-sentence, not per-full-story

### Pre-Intermediate — MVP (Phase 1)

- Full story, 400-900 words
- Present/past simple, continuous, basic "going to" future
- Mandatory contractions even in narration
- 0-1 `***` scene breaks
- Vocabulary: high-frequency, concrete, 500-1000 word families
- Comprehension questions: factual recall, answers included
- 2-3 personal questions
- Extreme Pronunciation block with symbol legend + Práctica Coral
- Ends with `—The End—`

**Current source format (from vault):** Markdown files with YAML frontmatter:
```yaml
---
title: The Soccer Jersey
level: pre-intermediate
cefr: A2/B1
ingested: 2026-08-03
type: story
---
```
Followed by: `# Title`, story body paragraphs, `—The End—`, `Comprehension Questions` (with answers), `Personal Questions`, `Extreme Pronunciation` (symbol legend + Práctica Coral).

**58 pre-intermediate stories currently in vault.**

### Intermediate — Phase 2

- Full story, 700-1,800 words
- All tenses freely
- 3-5 idioms/phrasal verbs per story
- 2-5 `***` scene breaks
- Comprehension questions: inference/synthesis, no answers given
- Sarcasm and dark comedy encouraged
- Ends with `—The End—`
- Layout: same as pre-intermediate (single page, scroll) but with scene break dividers

---

## 6. Annotation Pipeline

> The engine that transforms raw story files into structured data for both the web app and future print output.

### Input

A story markdown file from the vault (format documented in Section 5).

### Process

An LLM (GPT-4o, Claude, or equivalent) processes each story with a carefully constructed prompt that:

1. **Tokenizes** the story into individual words and multi-word expressions
2. **Translates** each word/expression into Spanish (best translation in context, not dictionary default)
3. **Phonetically transcribes** each word using Kyle's symbol system (the rules from the Extreme Pronunciation block)
4. **Identifies** multi-word expressions (idioms, phrasal verbs, fixed collocations)
5. **Marks** transparent words (cognates, words that don't need translation for Spanish speakers)
6. **Extracts** comprehension questions, personal questions, and pronunciation drill data from the existing story file

### Output

A JSON object matching the data structure in Section 4, ready to be inserted into the database.

### Kyle's Phonetic System (prompt rules)

The LLM must use these symbols consistently:

```
ö  = short u (But what luck!)
ü  = angry monkey (book/would/put/look)
ä  = listerine vowel (I do not want a lot.)
ör = dog RRRRRRR (fur/learn/sir)
ë  = schwa (a lot of commas)
i  = short i (bit, lick, ship, bitch)
ee = long e (beat, leak, sheep, beach)
dz = th with vibration (this, that, those, them)
th = th without vibration (thing, nothing, both)
...l = dark L (the girl will fill the world)
'  = glottal stop (tha' bu'on moun'ain in Manha'an)
v  = viper, vixen
z  = English Z (He loves bridges.)
dy = English J (Jill! Jump for the judge.)
```

### Video hosting — Pronunciation sound videos

> Kyle already has Bunny Stream (bunny.net) set up with pronunciation teaching videos.
> The original ~15 videos cover the sounds that are hardest for Spanish speakers. The app catalog is the full General American inventory: every IPA phoneme in a tooltip or dictation line is tappable and opens a video modal. Sounds without a Bunny GUID yet show a placeholder ("Todavia no tengo el video de este sonido"). Add GUIDs in `sound_videos.bunny_video_id` as videos are recorded.

**Cost: already covered by existing Bunny Stream account.** No new infrastructure needed.

Bunny Stream provides adaptive streaming, clean embeddable player, and domain restriction. Videos are already uploaded and in use in the existing pronunciation courses.

### Sound video data model

```
SoundVideo
  ├── symbol (string — Kyle's nickname for teaching materials: "ör", "ö", "ü", etc. Not shown in the app)
  ├── ipa (string — app lookup key, e.g. "ɝ")
  ├── ipa_aliases (string[] — extra IPA forms that open the same video, e.g. ["ɚ", "ər"])
  ├── name (string — "Dog RRRRRRR", "Short U", "Angry Monkey")
  ├── bunny_video_id (string — Bunny Stream video ID; empty until the GUID is added)
  ├── duration_seconds (integer — 120-240 range)
  ├── description (text — short explanation of the sound)
  ├── examples (string[] — example words: "fur", "learn", "sir")
  └── course (string — which pronunciation course this video is from)
```

### UX: two access patterns, same data

1. **Inline popup (Phase 2.5)** — Student taps any IPA sound in a pinned word tooltip or after dictation → modal opens with Bunny Stream video player (or a placeholder if that video is not uploaded yet). Close to return to reading. No page navigation.

2. **Sounds library (deferred)** — `/sounds` page showing all symbols in a grid. Each symbol card has name, examples, and embedded video. For systematic study. Same SoundVideo rows. Not in slices 30–32.

### Build placement

| Phase | Feature | Slice |
|---|---|---|
| Phase 2.5 | Click IPA symbol in tooltip or dictation explanation → video popup | Slice 30 |
| After Phase 2.5 | `/sounds` library page with all videos | Later slice; same SoundVideo data |

### Audio generation

After annotation, each word's text is sent to a TTS engine:
- **Primary: Edge TTS** (free, Python library `edge-tts`, en-US voices)
- **Fallback: OpenAI TTS** (~$0.015 per 1K characters, ~$2 for full library)
- Output: individual MP3 files per word, named by word ID
- Full-story audio: generated from complete story text, one MP3 per story

### Quality assurance

- Kyle reviews the annotation output for 3-5 stories before running the full pipeline
- Phonetic transcriptions checked against Kyle's system (the LLM will make some mistakes; these are corrected in the prompt iteratively)
- Multi-word expression detection is the most error-prone; review focus goes here
- Transparent word marking is reviewed (the LLM may mark too many or too few as transparent)

---

## 7. Feature Build Order (Vertical Slices)

> Each slice is built, verified on a real device, and committed to Git before the next slice begins.
> ROADMAP RESTRUCTURED 2026-08-21: Teacher-first build strategy. Phase 2 is now the full teacher dashboard (not the consumer $47 tier). Consumer features moved to Phase 5. See Section 2, Guiding Principle #14.

**Build progress (2026-08-24):**

| Phase | Status | Slices |
|---|---|---|
| 1 — Free Story MVP | COMPLETE | 1–10 |
| 1.5 — UX Fixes | COMPLETE | 11–12 |
| 2a — Auth + Courses + Stripe | COMPLETE | 13–22, 14–15 |
| 2b — Teacher Dashboard | COMPLETE | 23–29 |
| 2c — Writing Class | COMPLETE | 22a–22e |
| **2.5 — Pronunciation Videos** | **IN PROGRESS** | 30–32 |
| 3 — Azure Pronunciation | Planned | 33–35 |
| 4 — Knowledge Graph + Dashboard | Planned | 36–39 |
| 5 — Consumer Paid Tier | Planned | 40+ |

### Phase 1 — Free Story MVP (demand test) — COMPLETE

| Slice | What works after | Verification |
|---|---|---|
| 1. Project setup | Next.js project, Supabase database, folder structure, Git repo | Tables exist, project runs locally |
| 2. Story display | A story renders on a page, mobile-responsive, plain text | Open on phone, read it |
| 3. Word annotation + data import | One story fully annotated (words, translations, phonetics, expressions) and loaded into database | Query database, verify word data |
| 4. Hover/tap tooltip | Each word is a span. Hover (desktop) / tap (mobile) shows tooltip with Spanish translation | Test on phone and desktop |
| 5. Click-to-pronounce | Click a word → audio plays + phonetic transcription shows in tooltip | Click on phone, hear it |
| 6. Multi-word expressions | Tap any word in an expression → the full expression is highlighted and one tooltip shows for the group | Test with "pull the wool over my eyes" or similar |
| 7. Full story audio | Play button at top of story. Plays full story audio. Highlights current word as it plays (karaoke-style) | Listen on phone |
| 8. Comprehension questions (type + reveal) | Questions display after story. Student types their answer, clicks "Ver respuesta" to reveal the correct answer. Self-check, no AI. | Answer questions on phone |
| 8b. Personal questions + focused AI feedback (demand test for AI Coach) | Personal questions show text input. Student types their answer, clicks "Comprobar." AI (GPT-4o-mini via OpenRouter, server-side) gives inline visual corrections in Kyle's voice: green additions, red strikethrough deletions, amber moves. Feedback identifies at most 2 priorities. L1 interference error catalog (12 patterns) prevents misdiagnosis. 3 attempts, then input locks with soft upsell. After feedback, learner can revise the same answer (revision linked via `revised_from_id`). | Type a personal answer on phone, get AI feedback, revise |
| 8c. Dictation from Práctica Coral (listening diagnostic) | The story's Práctica Coral sentence plays as audio. No text visible. Learner types what they hear. After submitting, the standard spelling is revealed alongside their attempt. A one-sentence Spanish explanation (pre-authored by Kyle) identifies the error category. The phonetic respelling serves as the diagnostic scoring matrix. Optional activity, appears after personal questions. | On a phone, listen to the clip, type what you hear, see the comparison and explanation |
| 8e. Micro-explanations (onboarding callouts) | First-time callouts appear the first time a learner encounters each activity type. One or two sentences in Spanish, Kyle's voice, explaining why the activity works. Callouts dismiss on tap and do not repeat. | Open the free story as a new user, verify each callout appears once at the right moment |
| 9. Free story deploy | Story deployed to Vercel, accessible via public URL, no signup required | Send link to yourself, open on phone |
| 10. Analytics | Basic page analytics (Vercel Analytics): visits, unique visitors, bounce rate, referrers. | Verify all events in the analytics dashboard using the free story |

**Phase 1 status: COMPLETE.** All slices built, committed, and deployed. Demand test 1 run (August 2026): 235 visitors, 77% bounce, 0 shares. Product needs differentiation and UX improvements before re-testing. Dictation IS the differentiator (built but not yet tested with fresh eyes).

**NOTE on Extreme Pronunciation block:** Removed from the current page (post-Slice 9). The pronunciation drill (symbol legend, Práctica Coral) is not needed for the first iteration demand test. Data stays in Supabase. The section will return reimagined in Phase 2.5: dictation (listen + type) → IPA pronunciation explanation → Bunny Stream sound video popups. No separate text wall. See Guiding Principle #15 (IPA everywhere).

**NOTE on Slice 8d (Reverse Translation):** Planned but not yet built. Will be built when the consumer tier is developed (Phase 5) or when Kyle decides to add it to the classroom review mode.

---

### Phase 1.5 — UX Fixes (quick, pure frontend, no backend changes) — COMPLETE

| Slice | What works after | Verification |
|---|---|---|
| 11. Sticky audio player | While audio is playing, a sticky bottom bar persists on scroll (Spotify "now playing" pattern). Shows play/pause, thin progress line, current time. Hides when audio is paused or ends. 48px tall on mobile, centered wider bar on desktop. | Play audio, scroll down through story, pause from sticky bar |
| 12. Read/Practice navigation split | Story text scrolls freely (Read Mode). After "—The End—," a transition appears: "Ahora practica lo que leíste" with a button to enter Practice Mode. Practice Mode shows one activity at a time with a segmented control: Comprensión \| Personal \| Dictado. Progress indicator shows which step the learner is on. Kills the infinite scroll problem. | Read the story, reach the end, enter practice mode, navigate between activities using the segmented control |

**Phase 1.5 status: COMPLETE.** Sticky audio player and Read/Practice split shipped.

---

### Phase 2a — Auth + Course Management + Stripe (the "virtual handout" foundation) — COMPLETE

> Goal: Kyle creates a session, assigns a story, pastes a link in Zoom chat. Students click, they're in. Their work is tracked. The "virtual handout" replaces Google Docs.

**Slices 14–15 (Stripe webhooks): shipped 2026-08-24.** ThriveCart already creates real Stripe subscriptions in Kyle's live Stripe account. Existing students should be imported, not asked to re-subscribe. Teacher invite stays for nicknames, scholarships, and PayPal-only students.

Webhook endpoint: `POST /api/webhooks/stripe` on `https://learn.profekyle.com`. Events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`. Price IDs map to courses; unknown legacy ThriveCart prices still create the classroom user; Zoom session link enrolls them.

**Production billing (2026-08-24):** Live webhook on Vercel returns 200. Run `schema-phase2-stripe.sql` on production Supabase if not done. Bulk import of existing subscribers still pending. Map legacy price IDs (`price_1NlZcz…`, `price_1NlNR5…`, etc.) in env or enroll manually.

**Session link forwarding (resolved 2026-08-22):** Only existing classroom subscribers (`role = student-classroom`) can auto-enroll via the Zoom session link. Unknown emails can magic-link in, then see a Spanish message that the link is for the group. They are not enrolled.

**Pay vs group (resolved 2026-08-25):** Stripe/ThriveCart is payment only. Students who move up keep the same subscription. `profiles.classroom_level` is the live Zoom group. First Stripe sync or first Zoom link seeds it when empty. Teacher roster button moves them for this month and every future unarchived course at that level. A Zoom link for the other live group does not enroll them. One live home level: not both groups at once. Archived courses keep old enrollments. Run `schema-classroom-level.sql`.

| Slice | What works after | Verification |
|---|---|---|
| 13. Supabase Auth (magic link) | Student receives magic link via email, clicks, they're in. No password to remember. Session persists. | Enter email, receive magic link, click, access the app |
| 14. Stripe webhook — auto-create user | When a student pays via ThriveCart or a Stripe Payment Link, webhook auto-creates a Supabase Auth user from the payment email, role `student-classroom`. Known price IDs enroll the matching course. | Test-mode checkout, verify user + profile + period |
| 15. Stripe webhook — subscription lifecycle | Cancel/pause: `subscription_status` updates. Cancelled students keep sessions whose start falls in a paid `subscription_periods` window (`ended_at` = paid-through date). New sessions after that are blocked. Failed invoices do not lock them out during Stripe retries. | Cancel test sub, old session still opens, new session shows “Esta clase es nueva” |
| 16. User profiles with role | User profile created with role: student-classroom, student-consumer, or teacher. Role determined by context (Stripe payment = student-classroom; manual signup = student-consumer; Kyle = teacher). | Check database, verify roles assigned correctly |
| 17. Course creation (teacher side) | Teacher creates a course (e.g., "Inglés Intermedio"), sets level. Active students whose `classroom_level` matches are enrolled automatically. | Create a course in the dashboard, verify matching students appear on the roster |
| 18. Session creation (teacher side) | Teacher creates a session within a course, assigns a story, sets session start time (for 90-min window). System generates session link token. | Create a session, assign a story, verify link generated |
| 19. Student enrollment via session link | Student clicks session link (pasted in Zoom chat). If logged in and enrolled: straight to story. If logged in but not enrolled: auto-enroll into that course if they have no home level yet, or if the course matches `classroom_level`. A live link for the other group shows a Spanish “otro grupo” message. If not logged in: magic link, then the same rules. | Open session link as a new student, verify enrollment. After a teacher move, the old group’s Zoom link must not enroll them |
| 20. Attendance tracking (auto) | Any student who clicks the session link while teaching mode is on (scheduled class plus overtime until Terminar clase, or the four-hour cap) is marked attended. After teaching mode ends, clicking the link opens review but does not mark attendance. | Click link during class, verify attendance marked. Click after Terminar clase, verify no attendance |
| 21. Reveal answer gating | During teaching mode: comprehension questions show text input but NO reveal button. After the teacher taps Terminar clase (or four hours after the scheduled end, or teacher manually unlocks early): reveal becomes available. answers_revealed auto-flips when class_ended_at is set or at the overtime cap. Teacher dashboard has manual "Desbloquear ahora" button. | Create session, verify no reveal during class, verify reveal appears after Terminar clase or manual unlock |
| 22. Comprehension response persistence | Save student's typed comprehension answers to ComprehensionResponse table, linked to course_session_id. | Type answers during class, verify they appear in database |

**Phase 2a status: COMPLETE.** Slices 13–22 and 14–15 built, committed, and deployed. Magic link auth, course/session management, session links, attendance, reveal gating, comprehension persistence, and Stripe webhook sync are live.

---

### Phase 2b — Teacher Dashboard + Interaction Tracking — COMPLETE

> Goal: Kyle sees everything his students do. Full teacher dashboard, built for the Confident Speaker Circle / Sistema de 8.

| Slice | What works after | Verification |
|---|---|---|
| 23. Teacher course list view | `/teacher` route shows all courses, quick stats per course (student count, current session). | Open teacher dashboard, verify courses and stats |
| 24. Teacher course detail (roster) | `/teacher/classes/[id]` shows roster, session list, per-session attendance. Sortable by name, attendance, last activity. Paying students only. Teacher can move a student to the other live group without changing Stripe. | Click a course, verify roster. Move a student, verify they leave this roster and join the other unarchived course |
| 25. Teacher session detail | `/teacher/classes/[id]/sessions/[sessionId]` shows per-student completion: did they open the story, their comprehension answers, participation. | Click a session, verify per-student data |
| 26. Word lookup tracking | When student taps a word for translation, log first lookup per word per student per story to WordLookup table. | Tap words in story, verify lookups in database |
| 27. Word lookup aggregation | Teacher dashboard shows "Palabras más consultadas" per session: which words most students struggled with, ranked by lookup count. | Check dashboard, verify word lookup aggregation |
| 28. Student detail view | `/teacher/classes/[id]/students/[studentId]` shows that student's work across the course, grouped by session. Links from a session page use `?session=` so Kyle lands on that class. Comprehension answers, word lookups, attendance, timestamps. No diagnoses. | Click a student name, verify full interaction data |
| 29. Personal question context rendering | In classroom mode (while teaching mode is on): personal questions show display-only "Discutir en clase" label, no text input. In review mode (after Terminar clase): text input + AI feedback becomes available. Consumer students always get text input + AI feedback. | Open personal questions during class (no input), open after class (input available), verify context rendering |

**Phase 2b status: COMPLETE.** Teacher course list, roster, session detail, word lookup tracking/aggregation, student detail view, and personal-question context rendering shipped.

---

### Phase 2c — Writing Class (pulled forward from Phase 5) — COMPLETE

> Goal: Replace the Google Doc writing exercise with an interactive writing page. Teacher creates the prompt, students write with a synced timer, teacher corrects with inline visual diff. Students revisit the link to see their corrected text. See [[writing-class-methodology]] (Language-Wiki) for the full pedagogy and [[free-writing-research]] for the academic foundation.
>
> **WPM note:** Pre-intermediate uses true free writing (10 min, write freely, stop at zero), so WPM is a valid metric. Intermediate uses structured writing with editing allowed after the timer, so WPM is not displayed for intermediate — only word count.
>
> **Timer behavior:** During live class both levels lock at zero. Pre-intermediate: 10-min countdown, auto-submit at zero, text input locks. Intermediate: 20-min countdown, input locks at zero (Entregar still works for leftover text). Spec change from the original “intermediate stays open after zero.” Submit is available while the sprint is running, and after zero if they already have text.
>
> **After class (makeup):** Students with no real writing yet (`countWords === 0`, not corrected) can tap Empezar and run their own 10/20-minute sprint from `writing_submissions.started_at`. No due date. Anyone who already wrote stays in review/correction. Late entregas show as “Entregado · después de clase” on the teacher session list.
>
> **Dropped from scope (may revisit if students request):** Read-aloud button (TTS of corrected text — no value hearing a robot), revision attempt (students don't want homework), rubric score (not an IELTS/TOEFL prep class — Kyle gives oral feedback on dimensions instead of numeric scores).

| Slice | What works after | Verification |
|---|---|---|
| 22a. WritingPrompt creation (teacher) | Teacher creates a writing prompt as catalog content and assigns it to a session: question text, timer duration (20 or 10 min), level-specific content. CourseSession created with `session_type = "writing"`, `writing_prompt_id` set, `story_id` null. `timer_started_at` lives on the session. | Create a writing prompt in the teacher dashboard, verify it saves with correct level-specific fields |
| 22b. Student writing page + timer | Student clicks session link → stepped writing page (Preguntas, optional Ejemplo, Escribir, Revisión) with teacher-paced lock (ADR 010). Ejemplo shows the sample; intermediate also shows structure then TOEFL/IELTS rubric above it. Escribir has instructions (pre-int), questions, timer, box. Iniciar on the teacher session page starts the clock and snaps live phones to Escribir. During live class both levels lock at zero; pre-intermediate auto-submits. After class, empty students tap Empezar for their own 10/20-min sprint. Revisión shows submitted text, then the color correction when Kyle saves it. | Open session link as student, walk Preguntas → Ejemplo → Escribir, write, verify timer, submit, open Revisión. After class, empty student taps Empezar. |
| 22c. Teacher submission list + detail | Teacher dashboard shows all submissions for the session in a list. Each row: student name, word count, WPM (pre-intermediate), status (draft/submitted/corrected). Click a student → full text view. | Open teacher dashboard after students submit, verify list and detail view |
| 22d. Teacher correction editor | Teacher edits student's text in a textarea (like editing a Google Doc). Save → system computes word-level diff between original and corrected version using `diff` npm package. Teacher can also: add inline notes (click a word/phrase, type a short note shown as a comment bubble), highlight good vocabulary (click to mark blue). Color legend shown: `rojo = sobra, verde = falta, azul = buen vocabulario`. No rubric score, no revision attempt. | Edit a submission, add an inline note, highlight good vocab, save, verify diff computes correctly |
| 22e. Student correction view | Student revisits session link after correction → sees original text with corrections overlaid: red strikethrough for deletions, green highlight for additions, blue highlight for good vocabulary, inline teacher notes as small comment bubbles. Color legend at top. Reuses the inline correction rendering component from Slice 8b (same visual format, driven by teacher edits instead of AI). | Open session link after correction, verify diff display with colors, notes, and good-vocab highlights |

**Phase 2c status: COMPLETE.** Writing prompts, synced timer, student submit flow, teacher submission list, inline correction editor with diff, and student correction view shipped (slices 22a–22e).

---

### Phase 2.5 — Pronunciation Videos + Extreme Pronunciation Reimagined

> **COMPLETE.** `/sounds` catalog is deferred (same SoundVideo rows later).

> Goal: Bring pronunciation back, but as an interactive experience, not a text wall. Classroom students still do choral practice live with Kyle on Zoom during class. The in-app choral component is for consumer/free-story and for classroom review after the 90-min window.

| Slice | What works after | Verification |
|---|---|---|
| 30. Bunny Stream inline popups | Student taps any IPA sound in a pinned word tooltip → modal opens with Bunny Stream video player (placeholder if the GUID is still empty). Close to return. No page navigation. Hover peek is not tappable. | Pin a word, tap an IPA sound, verify video or placeholder in modal |
| 31. Dictation → IPA explanation → sound video flow | After dictation, student sees IPA transcription of the Práctica Coral sentence with Kyle's word-by-word pronunciation notes. Every IPA sound is tappable → opens the same sound video popup. Three-step flow: listen (dictation) → understand (IPA explanation) → learn (sound video). Shown in consumer/open and classroom review, not during live class. | Complete dictation, verify IPA explanation appears, tap a sound, verify video popup |
| 32. Choral practice (consumer + classroom review) | Práctica Coral audio plays 10 times per round (with ~1s gaps). 5 rounds = 50 reps. Each button click starts one round. Counter: "Repeticiones: 0/10" → counts up. Round indicator: 5 dots filling. After 5 rounds: "¡Práctica completa!" saved for logged-in users. Does NOT render during live class (students do choral practice live with Kyle). Renders in classroom review and for consumer/free-story. | Press play, verify 10 plays with gaps, verify round counter, complete 5 rounds, verify completion saved. Confirm hidden in classroom-live. |

---

### Phase 3 — Voice Recording + Pronunciation Assessment

> **COMPLETE.** Voice recording and Azure assessment live in the post-story practice block (consumer/open + classroom review). Hidden during classroom-live. In-session only: no PronunciationAttempt table. Anonymous users can assess, rate-limited (10/day per IP, and per user when logged in). Persistence deferred to Phase 4.

> Goal: Students who want pronunciation feedback get it. Uses Kyle's existing PronunciationPro2 codebase (production-grade Azure pipeline). Consumer + classroom review mode. No TPRS circling (that's Phase 5, beginner). No AI Coach dashboard (that's Phase 4).

| Slice | What works after | Verification |
|---|---|---|
| 33. Voice recording | Student records themselves via browser microphone. MediaRecorder pattern proven in PronunciationPro2. | Record a sentence, verify audio captured |
| 34. Pronunciation assessment (Azure) | Student reads a sentence. Azure scores phonemes. After review, the student sees a detailed analysis (word + phoneme breakdown), not a short tip-only card: what Azure heard in words, Kyle IPA, Azure expected IPA, and Azure's best guess of the sounds produced (n-best spoken phonemes). Up to two Kyle coaching notes stay inside that analysis. Numbers are practice guidance, not an official score. IPA is tappable (Phase 2.5 popups). | Record a sentence, verify Azure assessment and detailed feedback display |
| 35. IPA ↔ Azure phoneme mapping | Mapping table converts Azure's IPA phonemes to display format. No Kyle custom symbols in the app. | Verify assessment displays IPA consistently with tooltips |

---

### Phase 4 — Knowledge Graph + Smart Routing + Student Dashboard

> Goal: The system recommends next activities based on student evidence. Student-facing progress dashboard lives here. Built content-type-aware from the start: stories are the first content type, not the only one. Writing prompts, exams, dialogues, Movie Talks, and songs plug in later with zero schema change.

| Slice | What works after | Verification |
|---|---|---|
| 36. Content tagging | All stories tagged with grammar/vocabulary/phonetic topics via `ContentTag` (polymorphic junction: `content_type` + `content_id`). LLM-assisted, Kyle-reviewed. Difficulty scores already evaluated (202 items done). For Phase 4, all rows have `content_type = "story"`. | Verify tags on stories; verify query "which content covers present_perfect?" returns stories |
| 37. Evidence tracking | Student evidence per topic tracked via `UserTopicEvidence` (current-state row, unique on user + tag, one row per student per topic). Sources: reading, word_lookup, comprehension, personal_response, dictation, pronunciation. Status: seen / practiced / needs_more_practice. "needs_more_practice" is sticky — only a practice activity with a positive signal clears it. Writing and exam sources added later without schema change. | Complete activities, verify evidence tracked |
| 38. N+1 activity routing | System recommends next activity reusing familiar language, introducing one or two new elements, optionally targeting a recurring pronunciation issue from dictation data. Recommender returns `{ content_type, content_id }`, not `story_id`. For Phase 4, the only content type in the pool is "story." | Verify recommendation logic with test data |
| 39. Student-facing progress dashboard | Student sees their own practice summary: reading completed, dictation accuracy trends, words saved, pronunciation practice history, one suggested next activity. Described as suggestions, not diagnoses. Later rows (writing sessions, songs) are additive. | Open dashboard as student, verify progress data |

---

### Phase 5 — Multi-Level + Multi-Activity + Consumer Paid Tier

> Goal: Classroom lesson types first (exam, dialogue, Movie Talk, music), then consumer packaging. **Classroom types (45–47, 49a–49e) are built.** Consumer $47, beginner, reverse translation, and print stay later.

| Slice | What works after | Verification |
|---|---|---|
| 40. Consumer $47 lifetime tier | Stripe Checkout for one-time payment. Library page with all stories. Free users see lock icons, paid users open any. SRS (save words, review mode, progress stats). Highlighting + notes. PWA setup. | Make test payment, verify access, test SRS, install PWA |
| 41. Modern product tour (Shepherd.js) | Blur mask + spotlight on elements + text card + "Next" button. Replaces the callout boxes. Polished onboarding for consumer first-time users. | Open as new user, verify tour guides through features |
| 42. Full annotation pipeline | All 58 pre-int stories + all intermediate stories annotated and loaded. Audio generated for all. | Spot-check 5 stories |
| 43. Beginner carousel UI | Sentence-by-sentence reader for E4L1-style content. Swipe/arrow navigation. Different activity components per level. | Open beginner story, verify carousel works |
| 44. TPRS circling for beginners | Pre-authored TPRS circling questions (yes/no, either/or, WH) for beginner stories. Model answers for self-check. | Complete TPRS questions, verify model answer comparison |
| 45. Dialogue interactive reader | Class 5 content. Same annotation infrastructure as stories, different display component (Name-Dialogue format). | Open a dialogue, verify tooltips and audio work |
| 46. Movie Talk interactive player | Class 3 content. Interactive subtitles with tooltips. Role reading. Same annotation infrastructure. | Open a Movie Talk, verify interactive subtitles |
| 47. Music class interactive | Class 6 content. Story rows with `kind = "song"`: interactive lyrics (same word tooltips), fill-in-the-blank listening (`lyric_blanks`), embedded YouTube (`youtube_url`), karaoke via existing audio player. | Open a song, verify lyrics, blanks, and YouTube |
| 48. Writing class interactive | ~~Pulled forward to Phase 2c (slices 22a-22e).~~ Built as Phase 2c with teacher corrections (not AI). See Phase 2c above. | N/A — built in Phase 2c |
| 49a. Group exam prompt creation (teacher) | Teacher creates a GroupExamPrompt as catalog content and assigns it to a session: vocabulary list (20-22 words), fill-in-the-translation story (Task 1, both levels), Task 2 content (paragraph restructuring for intermediate OR sentence correction for pre-intermediate, auto-selected by level but teacher can override), translation sentences (Task 3, 10 Spanish sentences with accepted English translations, sentences 9-10 = conditionals). CourseSession created with `session_type = "exam"`, `exam_prompt_id` set, `story_id` and `writing_prompt_id` null. | Create an exam prompt in the teacher dashboard, verify it saves with correct level-specific Task 2 content |
| 49b. Exam group formation (teacher) | Teacher creates ExamGroups within the session: assigns 2-3 students per group, designates one writer per group, labels groups (Grupo A, Grupo B, etc.). All group members see the same exam instance. Only the writer can submit answers. Non-writers see the exam in read-only mode (can discuss, but only writer types). | Create groups, assign writer, verify non-writers see read-only exam, verify writer can type |
| 49c. Student group exam page | Students click session link → see group exam page: vocabulary list at top, Task 1 fill-in-the-translation story (inline inputs for each Spanish word slot), Task 2 (intermediate: drag-and-drop or letter-coded paragraph restructuring; pre-intermediate: sentence correction with correct/incorrect toggle + edit field), Task 3 translation (text input per sentence). Advisory timer (35 min, no hard cutoff). All inputs are writable only by the designated writer; others see answers live via Supabase Realtime as the writer types. Students can scroll between tasks; no requirement to finish all questions. | Open session link as writer, fill in answers, verify real-time sync to group members. Open as non-writer, verify read-only view with live updates |
| 49d. Teacher exam review mode | After the 30-40 min work period (or when teacher clicks "Iniciar revisión"), teacher dashboard shows all groups' submissions side by side. Teacher reveals correct answers question by question (review mode): each question shows all groups' answers + the correct answer. Teacher can click through one question at a time (Zoom screen-share). Incorrect answers become teaching moments. No grades assigned. | Click "Iniciar revisión", verify all group submissions appear, reveal answers one by one, verify display works for screen-share |
| 49e. Post-class review (student) | After the 90-min window (or when teacher unlocks), students revisit the session link and see: their group's answers alongside the correct answers, with Kyle's notes if any. This is the self-study review mode (same pattern as writing class correction view). Attributed to all group members. | Open session link after class, verify group answers + correct answers displayed |
| 50. Reverse translation | 2-3 key sentences per story. Forward (L2→L1) in one session. Reverse (L1→L2) 24-48h later. Original text is the answer key. No AI. | Complete forward, return later, complete reverse, see comparison |
| 51. Print PDF generation | Paged.js or WeasyPrint template. Same annotation data → print-ready PDF. | Generate PDF, verify formatting |
| 52. Amazon KDP Mexico | Upload print-ready PDFs. Amazon handles printing and shipping in Mexico. | Upload, verify listing |
| 53. IngramSpark (broader LatAm) | Expanded print distribution if Mexico demand is proven. | Upload, verify listing |
| 54. Video summary translation (classroom) | Pre-intermediate Class 3 content. Story row with `kind = "video_summary"`: YouTube embed, 5-min free writing sprint (student text area + timer, same pattern as Writing class), bilingual paragraph display (Spanish paragraphs from `VideoSummaryParagraph` with teacher's live English translation via Supabase Realtime — same one-writer-many-viewers pattern as exam group writer), inline teaching notes (teacher selects word/phrase in Spanish or English text, types quick note, classifies as vocabulary/grammar/pronunciation/cultural). Teacher reference panel with original English summary (collapsible, visible only to teacher). After class (review mode): students see completed translations + teaching notes. Free writing texts saved for teacher review and group exam diagnostic. | Open session link during class: YouTube plays, free writing timer runs, teacher types translations that appear live. After class: open link, see completed translations + notes |
| 55. Teacher content editor (ALL lesson types) | Teacher can edit catalog content of every lesson type directly in the dashboard without running terminal scripts or accessing Supabase. Index route: `/teacher/content` — lists all content by type (stories, dialogues, movie talks, songs, video summaries, writing prompts, exam prompts, presentation prompts), filterable by kind/level; this enables the Contenido rail item disabled in Slice 58. Edit routes per type: `/teacher/content/story/[slug]` (Story rows — fields vary by `kind`: `title`, `youtube_url`, `body_text`; comprehension questions (question + answer, add/delete/reorder); personal questions; pronunciation drill (`practica_coral_standard`, `practica_coral_phonetic`, `practica_coral_ipa`, `symbol_legend`, `focus_type`, `focus_content`, `word_notes` as editable word/note pair list, `coral_explanation`); songs add `lyric_blanks` as editable blank list; video summaries add `free_write_minutes` plus in-place editing of `video_summary_paragraphs` rows (spanish_text / english_translation)); `/teacher/content/writing/[id]` (`title`, `prompt_text`, `writing_time_minutes`, `structure_lesson`, `rubric_text`, `example_paragraph`); `/teacher/content/exam/[id]` (raw pipe-delimited textareas per field, with parse preview + validation via `parseExamForm()` before save — malformed text blocks the save); `/teacher/content/presentation/[id]` (`title`, `theme`, `warmup_question`, segments array: youtube_url, title, vocabulary list (english/spanish/example_sentence, add/delete/reorder), comprehension questions (add/delete/reorder)). All edits save to the same database columns the seed scripts write to. No AI, no re-annotation, no content creation — seed scripts remain the import path; the editor is for fixes. Changes appear on the live site immediately (next page load). Teacher-only (role check). Guards: `body_text` edits warn that karaoke timestamps and word annotations desync when word count changes; deleting a video summary paragraph row warns (rows hold live class translations); presentation edits warn when `presentation_responses` already exist (segment/question ids would desync from student answers). Does NOT edit word annotations (words/expressions are managed by the annotation script, not manually), nor class records (submissions, responses, teaching notes, exam groups). | Open `/teacher/content`, edit a presentation vocab item (e.g. Forefront → a la vanguardia), save, reload the lesson page, verify the change; edit an exam prompt field with malformed pipe text and verify the parse validation blocks the save. **BUILT 2026-09-21.** Deviations vs original prompt: conversation included; song fields (bio/meaning/IPA/timestamps) included as text/JSON, AI toolbox deferred; Movie Talk scene add/delete/reorder included, word-flag notes stay in-class; no blank catalog create; saves use admin client after `requireTeacher()` (teacher JWT cannot UPDATE stories); exam editor reverse-serializes stored JSONB to pipe text; video summary also edits `body_text` and `spanish_summary`; presentation segment parse keeps JSON array order (no sort-by-id). |
| 56. Presentation class (intermediate Class 3 Format A) | Teacher creates a PresentationPrompt as catalog content and assigns it to a session: title, optional warm-up question, 2-3 segments (each with YouTube URL, vocabulary list 8-20 items with English=Spanish + optional example sentences, comprehension questions 3-5 with answers). CourseSession created with `session_type = "presentation"`, `presentation_prompt_id` set. New route: `/presentation?session=`. Student page: step-based flow per segment (warm-up if present → for each segment: vocabulary pre-teach cards → give questions → YouTube embed → answer questions with text areas → self-check with "Ver respuesta" reveal). Classroom mode: YouTube controls teacher-only (same pattern as video summary, `video_playing`/`video_seconds`/`video_rate` on session, students tap picture once to follow). Review/consumer mode: normal YouTube controls, self-check reveal always available. Answers saved to PresentationResponse. See [[presentation-class-methodology]] (Language-Wiki) for the full pedagogy. | Create a presentation prompt in the teacher dashboard with 2 segments, assign to session. Open session link as student: see vocabulary cards, watch YouTube, type answers, self-check. Open as teacher during class: control YouTube playback for students |
| 57. Student dashboard shell (Inicio + Lecciones + tab bar) | Browsing-mode shell: sticky header (Profile icon only) + 3-tab bar (Inicio, Lecciones, Herramientas). `/dashboard` is the student home: greeting, class-day countdown/join/done card, progress card, "Este mes" 8-class stack with placeholder and live-only rows, recent practice. `/lessons` lists all sessions with type chips. `/tools` is a Próximamente empty state. `/profile` is the account stub. Teachers hitting `/dashboard` redirect to `/teacher` (invite form moved there). `recording_youtube_url` on `course_sessions` plus a recording banner on lesson/writing/exam pages after the window closes. Session types `conversation` and `pronunciation` are live-only (Zoom). `/progress` stays the drill-down. | Open `/dashboard` as a student at 375px: tab bar 56px, month stack, no horizontal scroll. Teacher visiting `/dashboard` lands on `/teacher` and can still invite. Placeholder rows are not tappable until a content FK is set. |
| 58. Teacher dashboard shell (3-column desktop layout) | Teacher-only shell on `/teacher/*`: left rail (Este mes, Grupos, Estudiantes, Analíticas, Contenido disabled), center column max 960px, optional right context panel. `/teacher` is Este mes (one card per current-month group, N/8 this month only, Nuevo mes = existing create-course form). A month-group that starts on the last three days of the previous month still counts as this month (e.g. Aug 31 opener for September). `/teacher/groups` lists unarchived then Meses anteriores. `/teacher/students` holds invite + global roster. `/teacher/analytics` is a Próximamente stub. Existing course/session/student detail pages are re-skinned inside the shell. No schema. No student chrome on teacher routes. | Open `/teacher` as Kyle on desktop: rail + group cards, select fills the right panel, chevron opens course detail. `/dashboard` still has the student tab bar only. |
| 58b. Zoom room URL + dual join links | Nullable `courses.zoom_url` (one Zoom room per group/month). Teacher pastes it on the group page. Student Inicio join card (T-10min through session end): **Entrar a la clase** (app session URL, omitted for live-only) and **Entrar a Zoom** (hidden when unset). Teacher Este mes and group page use the same card with **Abrir la clase** → `/teacher/classes/[id]/sessions/[sessionId]`. Countdown card stays countdown. Copiar link (session token for Zoom chat) is unchanged. | Paste a Zoom URL on a group, open Inicio in the join window, both buttons work. Clear the field, Zoom button disappears. Invalid URL is rejected. Teacher app button opens the teacher session page. |
| 59. Attendance + recordings | Manual asistió / no asistió on every session type. Auto from session-link click during the 90-min window (unchanged during live app classes). Teacher override after class and on Zoom-only classes. Checkbox grid: class-page Estudiantes list, and group-page right panel when a class is selected in the 8-class strip (not both at once). Zoom-style YouTube recording paste (`course_sessions.recording_youtube_url`): Guardar, then terracotta link + X. Archived months stay editable for attendance and recordings. Live-only (conversation / pronunciation) `completed` = this student attended. Those types stay cards, not lesson pages; a nested "Ver la grabación" link opens YouTube when a URL is set. `first_opened_at` nullable. Teachers INSERT/UPDATE attendance on own courses. | Open a class, toggle a student; reload, it stuck. Select a class on the group strip, same grid in the panel. Paste a YouTube URL, students see the recording link after the window. Mark a Zoom-only student present, their Inicio progress count goes up. |
| 60. Nuevo mes generator | Wizard on Este mes and Grupos creates a course + dated sessions from a fixed 8-row template (story, pronunciation, flex, conversation, dialogue, song, writing, exam). Same template for both levels. Class 3 is the only `flex` slot. Dates = chosen weekdays × one time, calendar-month only, cap 8. Name default `{Level} {YYYY} {MON}`. Optional `courses.theme`. Inherit `zoom_url` from the most recently scheduled same-level course. Enroll matching unarchived-level students. Auto-archive unarchived courses at that level whose month key is strictly before M (same-month siblings stay). Empty typed rows get **Elegir contenido** (Nueva clase pickers update this row). Flex **Por elegir** is level-aware: pre-int video_summary existing only; int presentation (existente or Nueva title) or Movie Talk existing. Unresolved flex is live-only (Zoom card, no lesson href). Student Lecciones keeps archived enrollments newest to oldest. Nueva clase stays bonus classes. | Open Nuevo mes, pick Intermediate + next month + Mar/Jue + time, Generar. Land on the new course page. Strip shows Por elegir on Class 3 and Sin contenido on empty typed rows. Assign a story. Resolve flex to an existing presentation. Student Lecciones still lists last month after archive. **BUILT fafd397 2026-09-22.** Deviations vs original prompt: CHECK relax so dialogue/movie_talk/song can generate empty; assign-on-strip (Nueva clase cannot fill an existing row); optional theme (Slice 58 deferred it here); duplicate same level+month is a warning, not a block; readiness after generate is 1/8 (pronunciation ready, flex not); redirect to the new course page; Este mes includes unarchived current OR future months so early generate does not blank the board; `loadDashboard` keeps archived enrollments. |
| 61. Conversation class (4-4-4) | Teacher creates a ConversationPrompt as catalog content and assigns it to a session: title, level (intermediate or pre_intermediate — both levels run Class 4), optional theme, 3-6 questions (jsonb array). CourseSession created with `session_type = "conversation"`, `conversation_prompt_id` set, plus round fields on the session (`round_current`, `round_state`, `round_started_at`). New route `/conversation?session=` upgrades the Slice 57 live-only card into a real lesson page. Student page is display-only (students never type): round number, countdown timer synced via Supabase Realtime, question list below. No role display — the same question set serves both halves (every student asks rounds 1-3, answers rounds 4-6), so every phone shows the identical page. Teacher-driven sync: teacher session page gets Siguiente ronda (advance + start timer), Reiniciar ronda, Pausar/Reanudar. Round length derives from course level (pre-int 4 min, intermediate 5 min), not stored. Countdown is a pure function of `round_started_at` + round length, resynced on every Realtime event — no client clock drift. Attendance unchanged (link-click auto-mark + Slice 59 manual override). Recording: after class the conversation page shows the shared RecordingBanner (same as exam/writing/lesson pages) via `sessionRecordingUrl()` — added 2026-09-07 (commit 949e7da) after the banner was found missing from the Slice 61 spec. Addendum: Slice 55 content editor + content index gain conversation_prompts (title, level, theme, questions add/delete/reorder; no desync guard needed — nothing references question ids). Pre-int writing prompt creation gains "Copiar preguntas de Clase 4": pick a conversation prompt, its questions copy into prompt_text as a numbered list, one-way snapshot at creation; intermediate writing unaffected (TOEFL-style standalone). See [[conversation-class-methodology]] (Language-Wiki) for the full pedagogy. | Create one conversation prompt per level, assign each to a session. Open as student: Ronda 1 de 6, countdown, questions. Tap Siguiente ronda as teacher: student page advances in Realtime. Timer reaches 0: Tiempo state clamps at zero. Tap through to round 7: Eso es todo. Create a pre-int writing prompt: Copiar preguntas de Clase 4 copies the chosen set into the textarea. Student who never opens the link: class proceeds identically (page is load-bearing for nobody). **BUILT 2026-09-08, commit 75a10f9 — spec deviations (recorded per truth-doc sync):** (1) round-plan picker in Nueva clase — `conversation_plan` on course_sessions ('standard' 6 rounds / 'compact' 3×10 min / 'open' sin rondas), chosen after seeing who showed up; this pulls the wiki's Plan B tiers into v1, which the spec's Don't-Build list had deferred; (2) questions composed inline in Nueva clase (title, theme, questions) rather than a separate prompt-editor route; (3) level CHECK is 'pre-intermediate' — the spec's 'pre_intermediate' was a spec bug, corrected against live code |
| 62. Dialogue session type + word flagging | Two features, one slice. **(a) Dialogue, Movie Talk, and Song session types:** `session_type = "dialogue"` with `story_id` set where `stories.kind = "dialogue"` — reuses the story lesson path (`/lesson/[slug]`), no new route, no new resolver branch. Original spec was dialogue-only; scope expanded during Cursor's plan review and ratified by Kyle (2026-09-08): `movie_talk` and `song` also become real session types (all three previously rode `session_type = "story"`, mislabeled), each with a kind-filtered picker in CreateSessionForm, and the Historia picker excludes all of them plus video_summary. Flagging UI scope is unchanged: songs get a session type but NO flag UI (ADR 009 — lyric flagging is Truquitos territory). Touches: `SessionType` union + `sessionTypeLabel` "Diálogo" (`src/lib/activities.ts`), CreateSessionForm "Diálogo" button (story picker filters `kind = "dialogue"`), `openedLabel` union (noun "el diálogo"), and BOTH CHECK constraints (`course_sessions_session_type_check` AND `course_sessions_activity_check` — the activity matrix needs a dialogue branch with story_id NOT NULL and all prompt ids NULL; verified neither constraint includes "dialogue" as of 2026-09-08). **(b) Word flagging (ADR 009):** persistent per-content bold/underline marks. New table `word_flags` keyed on `{story_id, flag_text, occurrence_index, flag_type}` — text+occurrence anchor, NOT word_id (re-annotation wipes the words table). Mark-only, no note fields. Full CRUD any time (prep/live/after); flags persist across every future class that assigns the text. Teacher-only rendering in v1 (Zoom screen-share carries it; no Realtime for flags): `word-flag-bold` / `word-flag-underline` CSS classes on word spans. Hotkeys first: ⌘B bold / ⌘U underline on text selection (toggle semantics: all-marked → unmark, mixed → mark all; only intercepted when the selection is inside the lesson text container and focus is not in an input/textarea). Mouse fallback: Subrayar / Negrita actions in the pinned word tooltip, single word. UI scope: story, dialogue, movie talk (song lyrics and video summary excluded). **(c) Student word-flag requests:** "No entendí" button in the existing pinned WordTooltip (students only, one tap, no form). New table `word_flag_requests` — session-scoped deliberately (badge = "N students in THIS class asked"), UNIQUE (course_session_id, user_id, flag_text, occurrence_index). Teacher view: live count badges next to his own marks via Realtime on the requests table (same pattern as exam group answers), one tap on a badge converts the request into a real bold flag (student "No entendí" = meaning issue → bold, matching ADR 009's semantic; the anchor's requests are then consumed — deleted — because the signal has become a durable flag; or Kyle flags it his usual way and ignores the badge). Student's own view: subtle personal marker on requested words; students never see each other's requests. Digitizes Kyle's "any words you want me to add to my list?" main-room question — the list builds itself during the breakout phase. | Create a dialogue session, open the lesson. As teacher: select two words with the mouse, ⌘B one and ⌘U the other; reload → marks persist. Select a bolded word again, ⌘B → unmarks. Re-annotate the story (`npx tsx scripts/annotate-story.ts`) → flags survive (anchor is text+occurrence). As student during class: pin a word tooltip, tap "No entendí" → teacher page shows a count badge within seconds (Realtime); student sees only their own marker. Teacher taps the badge → word becomes bold for everyone via screen-share; badge clears (requests consumed). Create a story session → flagging UI works there too (movie talk included; song shows no flag UI). **BUILT 2026-09-08, commit 4757073 — spec deviations:** movie_talk and song added as session types (not dialogue-only); teacher mark via hotkey/tooltip also deletes session requests for that anchor; backfill of old Historia rows by stories.kind |

| 63. Music class (Class 6 full build: teacher-paced steps, live worksheet, review + consumer self-study) | Songs upgrade from bare lyrics + list-style blanks to the full lesson. **Teacher-paced steps (new project-wide principle, Kyle's Rules #17):** `lesson_step_current` + `lesson_step_locked` on CourseSession; in live classroom mode students are locked to the teacher's current step (Realtime-synced; back-viewing earlier steps allowed); review and consumer modes free-navigate. Teacher-paced steps use the same bottom Atrás / Siguiente pills as presentation (not a header bar): those pills write `lesson_step_current` and jump live student phones; progress dots are local peek; **Abrir todas** / **Bloquear pasos** sits in the middle of that row. Implemented for song sessions in this slice; every step-based lesson type follows it going forward. **Student step flow (mirrors class segments 1-5 and the Etapa 1-4 guide; the consumer self-study blueprint per Guiding Principle #18):** bio → video → blind listen → blanks worksheet → lyrics + meaning → Truquitos + karaoke. New Story fields: `artist_bio` (annotated with the same Spanish/IPA tooltips as lyrics; words table gains a source discriminator 'body' | 'bio'), `song_meaning` (teacher-authored, never AI; unlocks after the blanks step), `lyrics_ipa` (per-line connected-speech IPA, AI-drafted from clean lyrics, Kyle-corrected via Slice 55; line-swap toggle, not hover — can't hover while singing), `line_timestamps` (tap-to-align against the official YouTube embed (ratified primary 2026-09-09, Hermes tool `scripts/tap-align-lyrics.html`; Whisper-on-MP3 = fallback for dense songs); drives karaoke highlight + auto-scroll + per-line seek-back; graceful degradation without them; official music-video URLs only). **Blanks worksheet (replaces paper — Kyle's #1 priority, ratified adoption-rule exception):** inline blanks in the scrolling lyrics (all lyrics visible, LyricTraining-style), sticky mini YouTube player, autosaved continuously (refresh-proof), no instant feedback; students finish then tap **Entregar respuestas** (every blank must have text; freezes inputs, scores, saves). Live class: Entregar only, no marks. Review/self-study: that one tap shows marks immediately. Wrong answers: student word, correct word to the right, then X. Teacher live typing in a blank replaces that blank on student phones via `song_class_answers`; student `song_lyric_attempts` stay saved. New table `song_lyric_attempts` (session-scoped; autosave writes unsubmitted rows, submit freezes + scores; review/consumer fresh passes are local-only in v1). **Per-blank seek-back:** review + consumer only, never live. **Analytics (derived, no table):** teacher session page shows per-blank difficulty (group miss rate, like word lookups) + per-student scores. **Slice 55 addendum:** song editor adds artist_bio, song_meaning, lyrics_ipa, line_timestamps editing plus the teacher AI toolbox (paste-box + one-click translate/annotate + IPA conversion, server-side; the timestamps button is deferred — local Whisper cannot run on Vercel; OpenAI Whisper API ~$0.006/min is the port path). Audio = YouTube embeds only, never hosted song audio. See [[music-class-methodology]] → Interactive Potential (17 resolved decisions, rounds 1-3, 2026-09-06/08). | Seed/extend a song (bio + meaning + blanks), assign a song session, open as student at 375px: bio with tooltips, video step, blind listen (audio only), worksheet with inline blanks + sticky mini player; type answers, refresh mid-exercise → answers survive; Entregar respuestas freezes + scores; teacher taps Desbloquear ahora → green checks / red X + strikethrough + green answer; teacher taps the bottom Siguiente pill → student page follows in Realtime and cannot skip ahead while locked; meaning block visible only after blanks; Truquitos toggle swaps lines to IPA; karaoke highlight follows the embed with auto-scroll; review mode after Terminar clase: fresh empty pass, seek-back buttons work; teacher analytics show per-blank miss rates + per-student scores; student who never opens the link → class unaffected. **BUILT 2026-09-08 — spec deviations (plan review, recorded per truth-doc sync):** (1) pacing is on the song lesson page when Kyle is logged in as teacher, not on the teacher session page; (2) snap-forward: the bottom step pills write `lesson_step_current` and jump live student phones to that step (students may then walk back; forward past the teacher stays disabled while locked); (3) lock auto-starts on first live teacher open if `lesson_step_current` is still null (first visible step + locked); Abrir todas survives refresh because we do not re-lock if current is already set; (4) only the bottom pills move the class; teacher dots are local peek; Abrir todas sits in the middle of that row (Kyle, 2026-09-09: drop the extra header bar; match presentation); (5) Completa la canción: one Entregar tap in review/self-study; live students cannot see marks; teacher typing overlays student phones (`song_class_answers`) without touching saved attempts. Analytics stay on the session page. Presentation keeps `presentation_step`. commit 5b5c561. Karaoke line_timestamps: Hermes tap-align tool built + browser-verified 2026-09-09 (`scripts/tap-align-lyrics.html` + SCRIPTS.md entry) — tap-to-align against the official embed is the ratified PRIMARY (timestamps the exact clock the class hears; NO karaoke_offset_seconds column — offsets bake into the stored JSON; Whisper-on-MP3 = fallback for dense songs). Kyle pastes the exported JSON into `stories.line_timestamps` via the Supabase Table Editor. |

| 64. Movie Talk class (Class 3 Format B full build: teacher-paced steps, scene cycle, character band, flag notes) | Movie Talks upgrade from the bare transcript reader to the full lesson. The app replaces Google Slides AND doubles as the post-class review instrument (same dual role as music; intermediate only — pre-int Movietalk is retired). **Steps (Kyle's Rules #17 pacing, bottom pills only):** optional Warm-up (step exists only when `stories.warmup_question` is non-empty) → Sinopsis (`stories.synopsis`) → per scene: **Video + Preguntas** (ONE step: synced ClassroomYoutubePlayer with the scene's 3-7 comprehension questions below it, each with an optional answer input; students may type + submit so Kyle sees what they wrote; typing optional, verbal Q&A still carries the class) → **Diálogo** (the scene transcript, role-read step) → next scene → end. **Teacher answer reveal:** when Kyle types his own answer to a question, it appears below each student's typed answer on their phone (teacher-gated live reveal; the presentation class-answers pattern, realized via `movie_talk_class_answers` jsonb on CourseSession keyed by question position, Realtime-pushed). **Character band (the role-read aid):** horizontal band atop the Diálogo step, characters statically derived from the WHOLE-lesson transcripts (all named characters, including scene-2-only ones); student taps a character → that character's lines highlight within the current scene's transcript; tap another → switches; selected character absent from the current scene → nothing highlights; selection resets per scene (no persistence, no registry); click-outside the dialogue area deselects; multiple students may share a character (independent selections). **Transcript annotation:** the transcript text is annotated like a dialogue (Word/Expression pipeline) EXCEPT character names; tap-to-reveal tooltips only (hover-to-reveal banned app-wide). **Word flags + notes (extends Slice 62 / ADR 009):** Kyle marks with ⌘U/⌘B during the role-read; NEW `word_flags.note` (nullable text): Kyle clicks a flagged word → writes the explanation; students tap a noted word → centered lightbox. Flags render student-side in movie talk (app replaces screen-share) and the note capability serves all text-centric kinds (story, dialogue, movie talk). **Video:** teacher-synced Realtime embed (play/pause/seek mirrored), starts at `start_seconds` (the deck's `&t=` offset), auto-pauses at `end_seconds` when set; dead clip → "clip no disponible" and the rest of the lesson still works. **Diálogo hidden until paced:** students cannot reach a scene's Diálogo step before the teacher does (forward locked while `lesson_step_locked`; back-viewing unlocked steps allowed). New table `movie_talk_scenes`; new Story fields `synopsis`, `warmup_question`; new CourseSession jsonb `movie_talk_class_answers`; `word_flags.note` column. Scene questions reuse ComprehensionQuestion (contiguous positions per scene; per-scene ranges stored on the rows). Missing answers: seed-time AI draft from the transcript, flagged for teacher review (~$0.01; seed: The Holdovers, deck answers provided). Seed script `scripts/seed-movietalk.ts` (canonical shape: typed array, `--slug`, `--force` guard on live responses). Slice 55 addendum: movie talk editor (scenes CRUD, synopsis, warmup, per-question answers, transcripts, flag notes editing). NO separate vocabulary step — flags + notes ARE the vocabulary surface (Kyle teaches in context). See [[movietalk-class-methodology]] → App Build Decisions. | Seed The Holdovers (3 scenes, 10 questions with answers, transcript), assign a movie_talk session, open as student at 375px: Sinopsis card; teacher taps bottom Siguiente → student phone follows in Realtime; Video step shows synced embed with questions below, student types an answer; teacher types his answer → appears below the student's on their phone; teacher advances to Diálogo → student transcript appears with character band; tap Michael → his lines highlight; tap outside → deselects; ⌘U a word as teacher during role-read, click it, write a note → student taps the word → lightbox; dead-clip scene (blank the URL) → "clip no disponible", questions + transcript still render; student who never opens the link → class unaffected; review mode after Terminar clase → free navigation, all questions/answers/transcripts visible. **BUILT 2026-09-21 — commit a0b15d1.** Spec deviations (plan review): ADR is 014 not 011; migration after baseline (`20260921180000`); routing matches songs in `StorySteps.tsx`; teacher answers are song-style JSONB debounce (no Listo); Slice 55 editor not built (addendum only); personal questions dropped; Holdovers office+classroom merged into scene 1; flag notes visible to enrolled classroom students on story/dialogue/movie talk (live+review), not consumer/open; students poll `word_flags` every 3s in live class (no Realtime fan-out); character band is per-scene (not whole-lesson cast); sticky bottom character bar on scroll (not header). |

| 65. Pronunciación Class 2 (calendar only + Class 1 practice gate) | Extreme Pronunciation is not a new catalog type. Nueva clase gains a **Pronunciación** button that creates `session_type = "pronunciation"` with all content FKs null (existing CHECK). Zoom-only: no app page, no `story_id`. Dictado / Coral / Pronunciación stay on the Class 1 story. Classroom students cannot see those three steps until the same course's pronunciation `session_start_time` (not T-10 joinAt, not Terminar clase). Teacher always sees them. If no pronunciation session exists on the course, do not lock. Dialogue, Movie Talk, and song are ungated. Open `/lesson/[slug]` without a session token still gates for enrolled classroom students assigned that story. **Plan review (2026-09-09):** calendar/Zoom only, no story FK; unlock at Class 2 start, not after Class 2 ends. | Nueva clase → Pronunciación → date/time → Crear. Strip shows Pronunciación · Contenido listo, no app Copiar link. Student Inicio in the join window: Zoom card only. After Class 1 ends and before Class 2 start: student story shows El cuento / Comprensión / Personal plus "Dictado, coral y pronunciación se abren el día de Pronunciación." Teacher on the same story sees all steps. At Class 2 start the three steps appear on the story. Course with a story and no pronunciation session: practice still appears after Class 1. **BUILT 2026-09-09.** |
| 66. Catalog CRUD v1 (delete + simple create) | Delete any catalog type from `/teacher/content` when no `course_sessions` row references it (archived months count). Children deleted parent-last. Confirm lists non-zero counts. Consumer/self-study rows warn but do not block. Delete gated to `CATALOG_ADMIN_EMAILS` (no admin role). Create writing/exam/presentation/conversation via `/teacher/content/{type}/new` then the Slice 55 editor. Story kinds are not creatable here. Nueva clase writing/exam/conversation: Nueva lección (existing compose) or Usar una anterior (copy row, assign the copy). Presentation still picks existing. No schema migration. **BUILT 937feae 2026-09-21.** Deviations vs original prompt: Nueva clase compose-or-copy added in this slice; delete env-gated rather than any-teacher; no `dictation_prompts` table (drill = dictado). | Create a throwaway writing/exam/presentation/conversation, land in the editor, see it on the index. Delete unreferenced throwaways. Assigned content is blocked with the Spanish class-count message. |
| 67. Ver como estudiante (read-only preview) | Teacher rail "Ver app como estudiante" opens `/teacher/preview` (Intermedio / Pre-intermedio). Session cookie `pk_student_preview` (httpOnly, lax, secure in production, no maxAge). Cookie is read only in teacher branches. Preview takes the student path: Slice 65 gate, step-lock, reveal-by-phase, no teacher controls. Writes skipped (enroll, attendance, `persistAnswersRevealedIfEnded`, student responses). Banner on BrowsingShell, LessonHeader, and `/progress`. Exam preview shows waiting-for-group. Dashboard preview lists the teacher's unarchived courses at that level (enrollment lookup does not apply). No schema. **Plan review:** keep the cookie; exam waiting-ok; preview is pre-class QA (other browser), not same-window teach+preview. **BUILT f0eca98 2026-09-22.** | Rail → pick Intermedio → `/dashboard` with moss banner. Open a session link: student chrome, inputs disabled. Volver al panel returns to `/teacher`. Zero new rows in attendance/enrollments/lookups/responses for the teacher id. |
| 67b. Lesson header view toggle | On a session-backed lesson, teachers get **Vista de estudiante** left of Inicio. Click sets `pk_student_preview` from the course level and redirects to the same URL. Label becomes **Vista de profe** (clears cookie, stays on the lesson). Inicio stays `/teacher` during preview. Rail whole-app path unchanged. Open `/lesson/slug` without a session: no toggle. No schema. **BUILT 2026-09-22.** | Open a class link as teacher → Vista de estudiante → student chrome, same URL, Inicio → `/teacher`. Vista de profe restores teacher pills. Students never see the control. |

---

### Classroom vs. Consumer Activity Flow Summary

**Classroom student (during class, teaching mode):**
1. Story (read, tap words, play audio with karaoke)
2. Comprehension questions (type answers, NO reveal)
3. Personal questions (oral discussion, "Discutir en clase" — display only)
4. Choral practice: done live on Zoom with Kyle, NOT in the app
5. YouTube lessons (Traducción, music, Movie Talk with a clip): teacher plays; students tap the picture once ("Toca el video para oír") then follow. Students cannot pause or scrub.

**Classroom student (after class, review mode — teacher taps Terminar clase, or four hours after the scheduled end):**
1. Everything from above
2. Comprehension reveal unlocked
3. Personal questions text input + AI feedback available
4. Dictation available (optional self-study)
5. Choral practice available (optional self-study)
6. YouTube: normal play/pause/scrub on the same lesson URL. Same player, no teacher lock.

**Consumer student (always):**
1. Story (read, tap words, audio with karaoke)
2. Comprehension questions (type + self-check with reveal)
3. Personal questions (text input + AI feedback, 3 attempts)
4. Dictation (listen + type, see where ear fails)
5. Choral practice (10x repeat, 5 rounds, completion tracking)
6. Pronunciation explanation + sound videos (Bunny Stream popups)

**Writing session (separate session type, `session_type = "writing"`):**
1. Student clicks session link → writing page with steps: Preguntas → Ejemplo (hidden if empty) → Escribir → Revisión. Live class is teacher-paced (`lesson_step_current` + lock). Students may walk back. Kyle opens the lesson with **Abrir la escritura** on the session page.
2. Teacher clicks "Iniciar" on the session page → timer starts on all connected students (Supabase Realtime) and phones snap to Escribir.
3. Student writes on Escribir. Both levels lock at zero. Pre-intermediate auto-submits. Intermediate can still tap Entregar if leftover text exists. Students may peek back at Preguntas/Ejemplo without stopping the clock.
4. Student clicks "Entregar" (or auto-submit at zero for pre-intermediate). Word count and WPM (pre-intermediate only) saved.
5. Teacher reviews all submissions in dashboard, corrects with inline diff (red strikethrough deletions, green additions, blue good-vocab highlights, inline notes). No rubric score, no revision attempt.
6. Revisión shows the submitted text, then the color correction underneath when Kyle has saved it. After class, empty students can tap Empezar for a personal makeup sprint.

**Exam session (separate session type, `session_type = "exam"`):**
1. Teacher creates GroupExamPrompt (vocabulary list, Task 1 story, level-specific Task 2, Task 3 translation) and assigns to session
2. Teacher forms ExamGroups (2-3 students per group, one designated writer per group)
3. Students click session link → group exam page. All group members see the same exam. Only the writer can type; others see answers live via Supabase Realtime (read-only view). Advisory timer (35 min, no hard cutoff — students don't need to finish)
4. Task 1 (both levels): Fill-in-the-translation — numbered story with Spanish words in parentheses, students pick from vocabulary list, morphological transformation required (tense, plural)
5. Task 2 (intermediate): Paragraph restructuring — scrambled 7-9 sentence paragraph, drag-and-drop or letter-coded reordering. Task 2 (pre-intermediate): Sentence correction — 10 sentences (7 incorrect + 3 correct), identify and correct errors
6. Task 3 (both levels): Translation — 10 Spanish→English sentences. Sentences 9-10 are 2nd and 3rd conditionals
7. Teacher clicks "Iniciar revisión" → review mode: all groups' answers displayed question by question alongside correct answers. Kyle reveals one question at a time for Zoom screen-share. No grades. Teaching moments on incorrect answers.
8. After Terminar clase: students revisit link → see their group's answers + correct answers (self-study review, same pattern as writing correction view)

**Video summary session (separate session type, `session_type = "video_summary"`):**
1. Teacher creates a Story row with `kind = "video_summary"`: YouTube URL, English summary (`body_text`), edited Spanish translation (`spanish_summary`), paragraph splits stored in `VideoSummaryParagraph` rows. Assigns to session.
2. Students click session link → video summary page. Before class starts they can watch the video only (normal YouTube controls). Steps 2 and 3 stay closed. During teaching mode, only the teacher has YouTube controls. Students tap the picture once ("Toca el video para oír") then follow. Teacher starts the 5-minute free writing timer from the session page. Entregar stays disabled until the timer hits zero. Texts saved to `VideoSummaryFreeWrite` for teacher review.
3. When the writing timer hits zero, students can open step 3 themselves. No teacher "Continuar" click. Bilingual display: Spanish in Lora (`story-body`), English in Roboto Flex (`story-english`). Teacher types English live (students see it appear via Supabase Realtime). Students do NOT type in translation fields. If a paragraph has no English yet, students see blank space, not a waiting pulse. Listo is teacher-only and stays available while teaching mode is on, including after the scheduled 90 minutes until Terminar clase.
4. Teacher can select any word or phrase in the Spanish or English text during live class → quick note popup (text + type: vocabulary/grammar/pronunciation/cultural). Note saved to `VideoSummaryTeachingNote` for that class session only (not reused on later sessions of the same lesson), with `text_side` so a Spanish highlight cannot attach to English. Teacher can delete a note from the lightbox. Highlighted text gets a visual marker (yellow background) visible to all.
5. Teacher reference panel (collapsible): the original English summary (`body_text`) for quick reference during the translation activity. Students do not see this during class.
6. After Terminar clase (review mode): students see the live class translation with notes, plus a collapsible "Ver inglés original". Free writing text not shown to other students. Teacher sees all free writing submissions in dashboard for group exam diagnostic. Teacher taps Terminar clase on the last lesson step (Traducción, or the last visible step on other lesson types).

**Presentation session (separate session type, `session_type = "presentation"`):**
1. Teacher creates a PresentationPrompt (title, optional warm-up question, 2-3 segments: each with YouTube URL, vocabulary list 8-20 items English=Spanish with optional example sentences, comprehension questions 3-5 with answers) and assigns to session. CourseSession created with `session_type = "presentation"`, `presentation_prompt_id` set.
2. Students click session link → presentation page. Optional warm-up question displayed first. Then step-based flow per segment:
   - Vocabulary cards: English word + Spanish translation. Example sentences shown for difficult/context-dependent words. This is the pre-teaching phase (5-10 min per segment in live class). Teacher can add or remove catalog vocab on the live page (A-Z). Full presentation editor is Slice 55 / 56b.
   - Comprehension questions displayed (students see the questions before the video, so they know what to listen for).
   - YouTube embed. Classroom mode: teacher controls playback (`video_playing`/`video_seconds`/`video_rate` on session, synced via Realtime). Students tap the picture once ("Toca el video para oír") then follow. One pass only.
   - After the video: teacher types each answer and taps Listo (Check). That text is synced to student phones. Students have no input during live class. After class (review): student text areas + "Ver respuesta" self-check against the catalog answer.
3. Repeat for each segment. Segments flow sequentially (segment 1 vocab → questions → video → answers → segment 2 vocab → ...).
4. After Terminar clase (review mode): students revisit link → normal YouTube controls (play/pause/scrub), type their own answers, self-check with "Ver respuesta". Answers saved to PresentationResponse for teacher review in dashboard.
5. Consumer mode (future): same page, normal YouTube controls, self-check always available. Optional AI feedback on written answers for premium AI tier.

---

## 8. UI/UX Design Principles

> **DESIGN.md is the source of truth for all visual decisions.** Read `DESIGN.md` at the project root before building or modifying any UI. The PRD describes WHAT to build. DESIGN.md describes HOW it looks and how it is structured on screen. When the two disagree on visual specifics, DESIGN.md wins.

### Design System

- **Theme: Paper Light.** Warm off-white (#faf6f0) background, earthy terracotta + moss palette, Lora (serif) + Roboto Flex (sans-serif) fonts. Not dark mode. Not pure white. Not Spotify-dark or Netflix-grid.
- **One layout, not two.** The app is a mobile app that breathes on desktop. Single centered column (max-width 672px) on all screen sizes. No sidebars, no multi-column dashboards, no split views. See DESIGN.md "Desktop Adaptations" section.
- **Navigation: two modes.** Browsing mode (bottom tab bar: Inicio, Lecciones, Herramientas) and Lesson mode (header with back button + lesson-specific subheader, no tab bar). See DESIGN.md "Navigation Architecture" section.
- **Step-based lesson flow.** Stories show one activity at a time (El cuento, Comprension, Personal, Dictado, Coral, Pronunciacion) with progress dots at the top and pill-shaped nav arrows at the bottom. Not a single-scroll wall of text.
- **Tokenized.** Colors, typography, border radius, and spacing all use predefined tokens in globals.css. Never hardcode hex values or arbitrary sizes. See DESIGN.md for the full token system.

### General

- **Mobile-first.** Most LatAm users are phone-first. Every feature must work on a phone screen (375px minimum).
- **Minimal friction.** The free story requires zero clicks before reading. No signup wall, no splash screen, no "choose your level." Just the story.
- **Reading is primary.** SRS, TPRS, and other features are accessed from separate pages or from a clear post-story transition. They never interrupt the reading flow.
- **Kyle's voice in the UI.** Error messages, tips, and feedback use Kyle's tone: direct, warm, no jargon. "You said X, but it should be Y. Here's why." Not "Incorrect answer. Please review the material."

### Classroom-specific patterns

- **Session link = virtual handout.** Kyle pastes a link in Zoom chat. Student clicks. If logged in: straight to story. If not: magic link, then story. The link token auto-enrolls and tracks attendance. No codes, no manual enrollment.
- **Reveal gating.** During class: comprehension questions show text input but no reveal button. After Terminar clase (or the four-hour cap) or manual unlock: reveal becomes available. Teacher controls when students can self-check.
- **Context-aware activity rendering.** Same reader component, different active features based on context (classroom during class / classroom review / consumer). Personal questions show "Discutir en clase" in class mode, text input in review/consumer mode. Dictation and choral practice don't render during live class. Both are available in classroom review and for consumers. The step flow respects this: classroom-live shows 3 steps (Story, Comprension, Personal), review and open modes show all 6.
- **Sticky audio player.** While audio is playing, a sticky bottom bar persists on scroll (Spotify pattern). Play/pause, scrubbable progress bar, skip 10s buttons, 0.75x slow speed toggle, current time. Hides when paused or ended. Only appears in Lesson mode (tab bar is hidden, so no conflict). See DESIGN.md "Audio Player Layout Rules" for full spec.

### Interactive reader (the core experience)

- Story text renders as readable prose (Lora, 18px, line-height 32px). Each word is an invisible span — no underlines, no buttons, no visual clutter by default.
- On hover (desktop) or tap (mobile): a lightweight tooltip appears with:
  - Spanish translation
  - Phonetic transcription (IPA)
  - Small audio icon to hear pronunciation
  - Small star/bookmark icon to save to SRS deck (Phase 4)
- Multi-word expressions: tapping any word in the expression highlights the whole expression and shows one tooltip for the group
- Previously translated/seen words get a subtle visual marker (light underline or dot) so the student knows what they've already interacted with
- Full story audio: play button at top. When playing, current word is highlighted (karaoke-style). User can pause and resume. Seek bar is scrubbable. 0.75x speed available.

### Story lesson page (step-based flow)

The story page uses a step-by-step flow (Layout A from DESIGN.md). One activity visible at a time, with progress dots at the top and pill-shaped nav arrows at the bottom.

**Steps (classroom-review and open mode):**
1. El cuento (story text + audio player + karaoke)
2. Comprension (comprehension questions, type + reveal)
3. Personal (personal questions, text input + AI feedback)
4. Dictado (dictation: listen + type + see comparison)
5. Coral (choral practice: 10x repeat, 5 rounds)
6. Pronunciacion (voice recording + Azure assessment)

**Steps (classroom-live mode):**
1. El cuento
2. Comprension (no reveal during class)
3. Personal ("Discutir en clase" label, no text input)
Steps 4-6 hidden. Progress dots show 3 instead of 6.

**"Ver el texto" bottom sheet:** On all practice steps (2-6), a "Ver el texto" button opens a bottom sheet showing the story text. Learner can reference the story without leaving the questions. See DESIGN.md "Bottom Sheet" spec.

### Library page (paid users)

- Stories (and other content types) organized by course and level
- Each card: title, level badge, word count, progress indicator (not-started/in-progress/completed)
- Free story marked as "Free"
- Search and filter by level, topic (Phase 4)
- Accessed via the Lecciones tab (browsing mode), not a separate page

---

## 9. Demand Validation Plan

### What we're testing

Whether the interactive reading experience (not a landing page, not a promise) generates interest and willingness to pay in the Latin American market. We are also testing whether the reader produces a second kind of value: a learner can make an honest listening attempt, understand one specific place they got lost, repair it, and want to try another story. This is a product-behavior hypothesis, not an assumption.

### How

1. Build Phase 1 (slices 1-10) — one free story, deployed, no signup
2. Create 3-5 short demo videos (15-30 seconds) showing the screen interaction:
   - A finger tapping a word, translation appearing
   - The audio playing, phonetic showing
   - A culturally interesting story being read
3. Post on Instagram Reels, YouTube Shorts, Facebook groups, WhatsApp
4. Add a link from 1-2 existing blog articles on profekyle.com: "Prueba una historia interactiva gratis aquí"
5. Track analytics for 3-4 weeks

### Signals and decisions

| Signal | What it means | Action |
|---|---|---|
| People click but bounce in <5 sec | Experience doesn't deliver | Fix the product (reader, story choice, load speed) |
| People stay, read, but don't share | Good but not remarkable | Improve story selection, interactivity, or shareability |
| People share it | Demand validated | Build Phase 2 |
| People ask "where's the rest?" | Strong signal | Build Phase 2 immediately |
| People share AND ask for more | Product-market fit | Build Phase 2 with urgency |
| Learners attempt the dictation but do not finish | The first attempt is interesting, but the comparison or explanation is unclear or too hard | Simplify the clip or explanation before adding more content |
| Learners complete the dictation and start another story | The listening loop creates genuine product pull | Build the paid story path and repeat the pattern |
| Learners submit but do not revise personal answers | Feedback is generic, too long, or not actionable | Reduce to one priority and ask for a smaller revision |
| Learners say "now I understand why I missed it" | The product has delivered the intended listening value | Continue validating the pattern across more stories |
| Learners return for the reverse translation step (24-48h later) | The delayed recall mechanism is creating genuine engagement | Expand to more sentences per story |
| Fresh-eyes users tap multiple words | The interactive tooltip is landing as a "wow" moment | This is the core hook. Build Phase 2 |

### The hooks (marketing angle for demo videos)

1. **The Anti-Promise:** "No te voy a prometer que vas a aprender inglés en 30 días. Toca la palabra. Escúchala. Si te gusta, hay más."
2. **The "I Wish I Had This":** "Cuando estaba aprendiendo español, habría matado por algo así."
3. **The Cultural Bridge Demo:** "Una historia sobre un canadiense perdido en Medellín. Toca cualquier palabra para traducirla."

### Timeline

| Week | Activity |
|---|---|
| 1 | Build the one-story prototype (slices 1-10) |
| 2 | Create demo videos, start posting |
| 3-4 | Post consistently, engage with comments, share free link |
| 4 | Read the data. Go/no-go decision. |

---

## 10. Kyle's Rules (for AI coding agents)

> These rules are injected into every AI coding session to maintain consistency.

1. **No em dashes (—) in UI text.** Use colons, periods, or commas. Em dashes are an AI telltale. The only em dashes in the app are in story content (`—The End—`) which is Kyle's existing format.
2. **Phonetic transcriptions use IPA everywhere.** The app uses IPA for all phonetic displays: tooltips, dictation, choral practice, pronunciation explanations. Kyle's custom symbols (ö, ü, ä, ör, ë, etc.) are deprecated in the app. IPA is universally recognized, transfers to dictionaries and other courses, and Kyle's pronunciation videos already teach IPA. One system, not two. The custom symbols remain in source story files and Kyle's teaching materials.
3. **UI copy is in Spanish for navigation/CTA, English for learning content.** "Quita de la cubierta" not "Remove from deck." The audience is Spanish-speaking.
4. **Mobile-first always.** If a feature doesn't work on a 375px wide screen, it doesn't ship.
5. **Never break a working slice.** When adding a new feature, do not modify code from previous working slices unless absolutely necessary. If you must, explain why.
6. **Commit after every working slice.** Git commit with the slice name and what works.
7. **Follow the data structure.** Do not create new tables or fields without updating this PRD first.
8. **Kyle's voice in all generated text.** Direct, warm, self-deprecating, no jargon, no corporate language. If the AI generates user-facing text (error messages, feedback, tips), it must sound like Kyle wrote it.
9. **Reading is primary.** No feature may interrupt or overlay the reading experience. SRS, TPRS, and other tools live on separate pages.
10. **Contractions everywhere in English content.** The app teaches spoken English. Even UI text in English uses contractions.
11. **Feedback must be small and actionable.** AI feedback identifies no more than two priorities at once, explains them in Kyle's Spanish voice, and offers a next attempt. Never show a giant correction block.
12. **No AI overclaiming.** The app must never claim an official test score, a CEFR level, a diagnosis, or objective pronunciation perfection. Azure and LLM output is practice guidance.
13. **Do not infer what the learner "thought."** Store observable behavior, such as a missing chunk or transcript reveal. If the reason matters, ask the learner in simple language.
14. **Keep the reader calm.** Dictation, reverse translation, and pronunciation practice begin after the story or from an explicit learner choice. They never pop up while somebody is reading.
15. **Group exam: level-differentiated Task 2.** Intermediate = paragraph restructuring (scrambled 7-9 sentence paragraph, letter-coded reordering). Pre-intermediate = sentence correction (7 incorrect + 3 correct sentences, identify and fix errors). The `task2_type` field on GroupExamPrompt auto-selects based on level but can be teacher-overridden. Task 1 (fill-in-the-translation) and Task 3 (translation with conditionals 9-10) are the same for both levels.
16. **Group exam: one writer per group.** Only the designated writer can submit answers. Other group members see a read-only view with live updates via Supabase Realtime. The ExamGroup entity tracks `writer_id` and `member_ids` for attribution. This is the only session type with group-based (not individual) submission.
17. **Teacher-paced steps in live classroom mode.** When a lesson has steps, students are locked to the teacher's current step during live class (`lesson_step_current` + `lesson_step_locked` on CourseSession, synced via Realtime; the presentation class's `presentation_step` is the precedent). The class-moving controls are the bottom step pills, same pattern as presentation. Progress dots are local peek for the teacher. Students cannot navigate ahead of the teacher; back-viewing unlocked steps is allowed. Review mode and consumer mode are free-navigate. New step-based lesson types MUST implement this, not just render steps. (Kyle, 2026-09-08, after noticing teacher/student view desync during live classes; 2026-09-09, music header bar dropped in favor of the presentation bottom-pill pattern.)
18. **Hover-to-reveal is banned app-wide; flags + notes are the vocabulary surface.** Word information is tap-to-reveal only, mobile and desktop — no hover-triggered tooltips anywhere. Teacher word flags (ADR 009) carry an optional note (Slice 64): students tap a noted word and a centered lightbox shows the explanation. The note capability serves all text-centric kinds (story, dialogue, movie talk). No separate vocabulary slide/step in Movie Talk — the in-dialogue flags + notes ARE the vocabulary surface; Kyle teaches vocabulary in context. (Kyle, 2026-09-08.)

---

## 11. Cost Summary

### Development (one-time)

| Item | Cost |
|---|---|
| AI coding agent (Cursor or Claude Code) | $20/month during build. Cancel after. |
| Domain (if new subdomain needed) | $0 (subdomain of profekyle.com, free) |
| Kyle's time | The real cost. But this is the work. |

### Runtime (monthly, after launch)

| Item | Cost at launch | Cost at scale (500 users) |
|---|---|---|
| Vercel hosting | $0 (free tier) | $20/month |
| Supabase | $0 (free tier) | $25/month |
| Audio hosting | $0 (static files) | $0-5/month |
| Domain | $1/month (amortized) | $1/month |
| AI Coach API costs (Phase 3 only) | N/A | ~$240/month (500 active users) |
| **Total at launch** | **~$1/month** | **~$291/month (with AI Coach)** |

### Per-sale economics ($47 one-time)

| | Amount |
|---|---|
| Price | $47.00 |
| Stripe fee (2.9% + 30¢) | -$1.66 |
| Net per sale | $45.34 |
| Runtime cost per user | ~$0 (static content) |
| **Margin** | **~$45.34 per sale** |

### Per-subscription economics ($7/month AI Coach)

| | Amount |
|---|---|
| Price | $7.00/month |
| Stripe fee | -$0.50 |
| API cost per active user/month | -$0.48 (average) to -$5.00 (power user) |
| **Margin** | **$1.52-$6.02/month per subscriber** |

---

## 12. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Browser microphone access unreliable on older Android phones | Medium | Test on real devices early. Fallback to simpler recording method if needed. Native app for pronunciation only as last resort. |
| LLM phonetic transcriptions have errors | High (expected) | Kyle reviews 3-5 stories. Prompt refined iteratively. Correction tool built for Kyle to fix individual words. |
| Multi-word expression detection misses expressions | Medium | Kyle reviews. Easy to add missed expressions via admin tool. |
| Demand test shows no interest | Low (product is genuinely different) | The free story costs one week to build. If it fails, the loss is minimal. Iterate on story choice or marketing angle. |
| Codebase becomes spaghetti | Medium (this is Kyle's stated concern) | Follow the vertical slice discipline. PRD is the north star. Git commits after every slice. One feature at a time. |
| WordPress site disruption | Very low | WordPress is not touched. App is a separate subdomain. Zero migration. |
| Stripe not available in some LatAm countries | Low | Stripe works in Mexico, Brazil, Colombia, Peru, Chile, Argentina. Covers the primary markets. |
| AI feedback feels generic or overwhelming | Medium | Limit feedback to one or two priorities, show a concrete example, ask for a revision, and measure revision rate in the demand test. |
| Pronunciation score is treated as an objective verdict | Medium | Present practice guidance first. Use Kyle's explanations, reference audio, sound videos, and a next attempt. Avoid language such as "your level" or "your score proves." |
| Dictation disrupts the calm reader experience | Medium | Place it after the story, make it optional, and test one short Práctica Coral sentence only in the free story. |
| Reverse translation 24-48h delay requires return visit | Medium | The delay is the pedagogical mechanism (desirable difficulty). If return rates are low, test shorter delays or notify the learner. |
| More data fields delay the free-story launch | Medium | Add the schema now but annotate and instrument only one story. Do not build the teacher extension in Phase 1. |
| Learners resist dictation as "boring school exercise" | Medium | Reframe with micro-explanations. Market as a "listening X-ray," not a spelling test. Latin American cultural familiarity with dictation reduces friction. |

---

## 13. Resolved Questions

- [x] **Which pre-intermediate story for the free MVP?** → The Soccer Jersey. Recent story, connects with Latin Americans (both men and women), culturally rich (immigrant family, Real Madrid vs Barcelona, mother's English struggle).
- [x] **Exact subdomain:** → `learn.profekyle.com` (corrected: domain is profekyle.com, not profitkyle.com).
- [x] **Does Kyle still have the Azure pronunciation assessment code?** → YES. Located at `/Users/kylote/Desktop/webdev/PronunciationPro2/`. This is a production-grade pipeline, not a prototype. See Section 15 for full inventory.
- [x] **Should the free story include the Extreme Pronunciation block?** → Originally yes, then removed post-Slice 9. Will return reimagined in Phase 2.5: dictation → IPA explanation → sound video popups. No text wall. See Guiding Principle #15 (IPA everywhere).
- [x] **How many intermediate stories?** → ~38 in PDF format, 60+ total (many not yet in PDF). Most not yet in the vault as markdown files.
- [x] **Phonetic transcription system: Kyle's custom symbols or IPA?** → IPA everywhere (resolved 2026-08-21). Kyle decided to use IPA in the interactive reader because his pronunciation videos already teach IPA, and IPA transfers to dictionaries and other courses. Kyle's custom symbols (ö, ü, ä, etc.) are deprecated in the app but remain in source story files and teaching materials. One system for the student, not two.
- [x] **Teacher-first or consumer-first build strategy?** → Teacher-first (resolved 2026-08-21). Phase 2 is the full teacher dashboard, built for Kyle's real Confident Speaker Circle / Sistema de 8 classes. Consumer paid tier moved to Phase 5. Real student data drives product refinement before consumer demand testing.
- [x] **Classroom vs. consumer: same product or different?** → Same reader, different overlay (resolved 2026-08-21). The story reader and activity components are identical. Context determines which features are active: classroom mode (no reveal, oral personal questions, no dictation/choral) vs. review mode (everything unlocked) vs. consumer (everything always). See Guiding Principle #16.
- [x] **Student authentication method?** → Magic link (resolved 2026-08-21). Student enters email, receives magic link, clicks, they're in. No password to remember. Lower friction. Adequate security for the current data sensitivity level.
- [x] **Student account creation flow?** → Auto-create via Stripe webhook (resolved 2026-08-21, verified ThriveCart 2026-08-24). ThriveCart checkout creates a Stripe Customer + Subscription. Webhook auto-creates a Supabase Auth user from the payment email. Teacher invite remains for nicknames and exceptions. Subscription lifecycle (cancellation, pause, renewal) managed via Stripe webhooks.
- [x] **Subscription model?** → Monthly subscription, auto-renews (resolved 2026-08-21). Each month = 8 classes. Students can cancel/pause anytime via ThriveCart or Kyle cancels in Stripe. Students who cancel keep access to materials from their paid subscription period but lose access to new materials.
- [x] **Attendance tracking?** → Automatic via session link click during the 90-min window (resolved 2026-08-21), plus teacher manual override after class and on Zoom-only classes (Slice 59, 2026-09-07). After the window, opening the lesson does not mark attendance. Unchecking during a live app class is not a workflow; a refresh still auto-marks if they opened the lesson in the window.
- [x] **Reveal answer gating in classroom?** → Teacher ends class with Terminar clase (resolved 2026-09-07, updated from 90-min auto-unlock). Session still has a scheduled 90-min window. Teaching mode continues if class runs long, until the teacher taps Terminar clase on the last lesson step (or four hours after the scheduled end). During class: no reveal. After class ends: auto-unlock. Teacher still has manual "Desbloquear ahora" for early unlock.
- [x] **Due dates for assignments?** → No (resolved 2026-08-21). Kyle's methodology: students pay to learn IN class, not outside. Homework = go watch Netflix, read a book, talk to a native speaker. No due dates needed. (Due dates may be added for other teachers if the product is sold as a teacher tool in the future.)
- [x] **Choral practice in the app?** → Consumer/free-story always, plus classroom review after the 90-min window (updated 2026-08-26). Classroom students still do choral practice live with Kyle on Zoom during class; the in-app component is hidden in classroom-live. After class it is optional self-study, same as dictation.
- [x] **Personal questions in classroom?** → Oral discussion, not written (resolved 2026-08-21). During class: personal questions show "Discutir en clase" label, no text input. In review mode: text input + AI feedback becomes available for written practice.
- [x] **Dictation in classroom?** → Consumer only (resolved 2026-08-21). Dictation is for self-learning students. Does not render in classroom mode. Available in review mode (optional self-study) and for consumers.
- [x] **AI Coach dashboard — what is it?** → Student-facing progress summary (resolved 2026-08-21). Moved to Phase 4 alongside knowledge graph + smart routing. The "next recommended story" part IS smart routing, so it belongs together. Phase 3 is just voice recording + pronunciation assessment, no dashboard.
- [x] **TPRS circling questions — when?** → Phase 5, beginner only (resolved 2026-08-21). TPRS circling (yes/no, either/or, WH questions with model answers) is a beginner-level activity. Not needed for pre-intermediate or intermediate stories.
- [x] **UI design inspiration?** → Paper Light theme (resolved 2026-08-28). The app uses a warm off-white (#faf6f0) background with an earthy terracotta + moss palette, Lora + Roboto Flex fonts, and a single-column mobile layout that breathes on desktop. Not Spotify-dark, not Netflix-grid. See DESIGN.md at the project root for the complete design system.
- [x] **Sistema de 8 class overview?** → Wiki page created (resolved 2026-08-21): `Language-Wiki/concepts/sistema-de-8-overview.md`. Documents all 8 intermediate classes. Pre-intermediate structure documented per-class as methodology pages are created.
- [x] **Group exam methodology?** → Wiki page created (resolved 2026-08-25): `Language-Wiki/concepts/group-exam-methodology.md`. Documents Class 8 at both levels (Task 1 fill-in-the-translation, Task 2 paragraph restructuring vs sentence correction, Task 3 translation with conditionals). PRD updated with GroupExamPrompt, ExamGroup, GroupExamSubmission data models and slices 49a-49e.
- [x] **Movie Talk app design?** → Converged (resolved 2026-09-08/09, brainstorm rounds 2-3): the app replaces Google Slides and doubles as the review instrument; per-scene cycle Warm-up (optional) → Sinopsis → [Video + Preguntas (one step, questions below the embed, optional student inputs, teacher's typed answer appears below the student's) → Diálogo] → end; no separate vocab step (flags + notes in the dialogue ARE the vocabulary surface); character band (whole-lesson derived, per-scene reset, click-outside deselects, shareable); bottom-nav pacing only (project-wide); synced embed with `&t=` start offset + scene-end auto-pause; tap-to-reveal only (hover banned); word_flags gains a note column (amends ADR 009, serves story/dialogue/movie talk); missing answers AI-drafted at seed; seed lesson The Holdovers (deck answers provided 2026-09-09). Full decision record: `Language-Wiki/concepts/movietalk-class-methodology.md` → "App Build Decisions". Slice 64 specced; pre-int Movietalk retired and out of scope.

## 14. Open Questions (remaining)

- [ ] Pricing experiment: $47 lifetime vs $47 + $7/month AI Coach vs $5/month subscription only. Test after consumer demand validation.
- [ ] Beginner UI pattern: carousel, accordion, or something else? Decide in Phase 5.
- [ ] Intermediate stories need to be ingested into vault as markdown files (currently ~38 PDFs + others not digitized).
- [ ] Does the Práctica Coral dictation increase second-story intent or reduce it?
- [ ] Which micro-explanation phrasing best reframes dictation from "school exercise" to "listening diagnostic"?
- [ ] Does focused AI feedback produce an actual personal-response revision? (Measure revision rate.)
- [ ] Does the reverse translation 24-48h delay produce return visits? Or do learners forget and not come back?
- [ ] Which key sentences work best for reverse translation: Práctica Coral, twist lines, or grammar-heavy sentences?
- [ ] Should dictation use Kyle's recorded audio or TTS? (Kuo 2019 says TTS works, but Kyle's voice may have pedagogical value.)
- [ ] Which single learner-evidence signal would a teacher find useful enough to assign this tool to a group? Validate only after consumer demand is established.
- [x] **Video summary translation methodology?** → Wiki page created (resolved 2026-08-31): `Language-Wiki/concepts/video-summary-translation-methodology.md`. Documents pre-intermediate Class 3: video selection (dialogue-free YouTube, 3-6 min), English summary writing, Google Translate → "English-structured Spanish" editing technique, class flow (watch → free writing → group reverse translation), vocabulary (pre-teach + emergent), pedagogical links to BDT, free writing research, and group exam Task 2. PRD updated with Slice 54, `VideoSummaryParagraph`, `VideoSummaryFreeWrite`, `VideoSummaryTeachingNote` data models, `Story.kind = "video_summary"`, and `session_type = "video_summary"`.
- [x] **Presentation class methodology?** → Wiki page created (resolved 2026-09-04): `Language-Wiki/concepts/presentation-class-methodology.md`. Documents intermediate Class 3 Format A: 6-step per-video cycle (announce → pre-teach vocab → check → give questions → watch → review), video selection (2-3 videos 4-6 min or 1 long split into 3), vocabulary design (English=Spanish, 8-20 per segment, student-referenced example sentences), comprehension question evolution (information questions only), monthly theme connection, Movie Talk comparison, web app design. PRD updated with Slice 56, `PresentationPrompt`, `PresentationResponse` data models, `session_type = "presentation"`, new `/presentation` route. Google Workspace OAuth set up for pulling Google Slides content.
- [x] **Conversation class methodology + app scope?** → Both resolved 2026-09-06/07. Wiki page created: `Language-Wiki/concepts/conversation-class-methodology.md` — documents Class 4 (the 4-4-4): adapted from Paul Nation's 4/3/2 fluency technique (origin Maurice 1983; citations verified via OpenAlex: Nation 1989 System 17(3):377, Arevart & Nation 1991 RELC 22(1):84). Kept: same-content repetition to a new partner each round, improve-on-what-you-said loop. Rejected: shrinking timer (constant 4 min pre-int / 5 min int). Converted: prepared monologue → prompted Q&A (askers get a productive role). Added: half-class asker/speaker split with half-time role switch (6 rounds), teacher eavesdrop with live public English chat recasts, bilingual checkpoints, monthly-theme question sets (3-6, same set both halves), fluent-speakers-first pairing, Plan B tiers (5+ standard / 3-4 free Q&A rounds / under 3 teacher moderates). App scope (Slice 61, decided with Kyle): v1 is display-only teacher-synced companion — round number + countdown + questions, students never type. NOT built in v1 (deliberate): role assignment display, student-local timers (Kyle requires all pairs start/finish simultaneously — teacher-driven sync is mandatory, not a convenience choice), per-student responses, review mode, AI conversation partner (premium tier). Design rule: page is load-bearing for nobody — class proceeds identically if a student never opens the link (adoption is ~7/10). Teacher sync fields live on CourseSession (round_current/round_state/round_started_at). Pre-int writing prompts gain "Copiar preguntas de Clase 4" one-way copy; intermediate writing unaffected (TOEFL-style).
- [x] **Dialogue class methodology + word flagging?** → Resolved 2026-09-07/08. Wiki page: `Language-Wiki/concepts/dialogue-class-methodology.md` — cold read in breakout pairs/threes, corrections collected never delivered (Zoom chat-box only during questions), vocabulary review is the largest teaching block (underline = pronunciation heard live, bold = prep-predicted comprehension blocker). App design (Slice 62 + ADR 009, decided with Kyle): teacher word flags are persistent per-content marks (same ~99% of words trip every group; flags converge toward "the words this text always needs"), keyed on `{story_id, flag_text, occurrence_index, flag_type}` — text+occurrence anchor, NOT word_id (re-annotation wipes the words table). Mark-only, no notes; full CRUD any time. Teacher-only rendering in v1 (Zoom screen-share; no Realtime for flags). Student "No entendí" requests ride the pinned WordTooltip → session-scoped `word_flag_requests` table (badge = "N students in THIS class asked"; cross-class accumulation would inflate stale counts) → live count badges on the teacher view → one-tap convert to bold (consumes the requests). Hotkeys ⌘B/⌘U (toggle; focus-guarded, lesson-container-guarded), mouse fallback in the pinned tooltip. UI scope: story, dialogue, movie talk; song and video summary excluded. Dialogue session type: reuses the story lesson path (`/lesson/[slug]`), `session_type = "dialogue"` + story_id where kind = "dialogue", label "Diálogo" — both CHECK constraints verified to lack "dialogue" (2026-09-08) and both get the new branch.
- [x] **Music class app design?** → Resolved 2026-09-06 + 09-08 (three brainstorm rounds; source of truth: [[music-class-methodology]] → Interactive Potential, 17 decisions). The app is BOTH the live-class worksheet (students type blanks in-app, replacing paper — Kyle's #1 priority; deliberate Kyle-ratified exception to the adoption-gated display-only rule) AND the review/consumer self-study instrument (step flow mirrors the class segments AND the Etapa 1-4 guide; doubles as the consumer blueprint per Guiding Principle #18). Truquitos: Kyle's bastardized notation stays in-class/deck; the app's IPA overlay is AI-drafted from the CLEAN lyrics (never machine-parsed from his notation — disambiguation is impossible, Kyle's own correct concern) and Kyle-corrected in the Slice 55 editor. Meaning block: teacher-authored, never AI, unlocks after blanks. Per-blank seek-back: review/consumer only. No live teacher dashboard during the blanks segment (Kyle controls playback himself); submit-before-reveal ("Entregar respuestas"); reveal teacher-gated live. Teacher AI toolbox (paste-box + translate/IPA one-click buttons) = Slice 55 scope; music classroom slice ships first. YouTube embeds only, never hosted audio. Line timestamps: tap-to-align against the official YouTube embed — ratified primary 2026-09-09 (Hermes tool `scripts/tap-align-lyrics.html`; timestamps the exact clock the class hears; NO offset column — offsets bake into the stored JSON); Whisper-on-MP3 stays the fallback for dense songs. Also ratified this round: Guiding Principle #18 (lesson types transfer to consumer tier by default; classroom-only designs are recorded exceptions) and Kyle's Rules #17 (teacher-paced steps — students cannot run ahead of the teacher in live classroom mode; requested after Kyle noticed teacher/student view desync in Cursor builds).
- [ ] Pre-intermediate Sistema de 8 structure: partially documented. Class 3 (video summary translation) is now fully documented. Other pre-int class differences still need confirmation from Kyle.
- [x] **RETURN TO SLICES 14–15.** ThriveCart uses standard Stripe objects (Customer + Subscription) in Kyle's Stripe account. Confirmed events: `checkout.session.completed` (email in `customer_details.email`), `customer.subscription.deleted`. Live price IDs: pre-int `price_1TS8vhLUSDWbekSXTBa1D9U4`, intermediate `price_1TS4VvLUSDWbekSXiMziWE1S`. Older ThriveCart prices may differ; unknown prices still create the user. Do not cancel ThriveCart subscriptions to "move" students. Import existing live subs after the webhook is verified in test.
- [ ] Magic link email deliverability: will Supabase auth emails land in spam for LatAm email providers (Gmail, Hotmail, Yahoo LatAm)? Need to test with real student emails.
- [x] **Session link security?** → Subscribers only (resolved 2026-08-22). If a student forwards the Zoom link, the recipient can log in but is not auto-enrolled unless they already have `role = student-classroom`. The unguessable token is not an open enrollment gate.
- [x] **What happens when a student is enrolled in both groups?** → One live home level (resolved 2026-08-25). `classroom_level` is the Zoom group. Not both unarchived courses at once. Stripe price stays as-is (no cancel/resubscribe to move). Archived months keep history. Old materials from paid periods still follow `subscription_periods`.

---

## 14. References

- [[profe-kyle-brand-personality]] — Brand voice and personality
- [[kyle-marketing-voice]] — Email marketing voice analysis
- [[email-structure-sop]] — Email structure formula
- [[group-exam-methodology]] (Language-Wiki) — Class 8 full methodology: task mechanics, vocabulary selection criteria, level differences, execution flow, web app implementation requirements
- [[video-summary-translation-methodology]] (Language-Wiki) — Pre-intermediate Class 3 full methodology: video selection, English-structured Spanish translation technique, class flow, BDT adaptation, free writing diagnostic link to group exam
- [[presentation-class-methodology]] (Language-Wiki) — Intermediate Class 3 Format A full methodology: 6-step per-video cycle, video selection criteria, vocabulary design with student-referenced example sentences, comprehension question evolution, monthly theme connection, Movie Talk comparison, web app design
- [[writing-class-methodology]] (Language-Wiki) — Class 7 full methodology (intermediate Task 2 paragraph restructuring reinforces Class 7 structure)
- [[spanish-l1-interference-error-catalog]] (Language-Wiki) — L1 interference error patterns tested in pre-intermediate Task 2 (sentence correction)
- [[sistema-de-8-overview]] (Language-Wiki) — Full 8-class cycle overview
- Language-Wiki/raw/stories/pre-int stories/ — 58 pre-intermediate story source files
- Kyle's phonetic system (documented in each story's Extreme Pronunciation block)

---

## 15. Existing Code Inventory — PronunciationPro2

> Location: `/Users/kylote/Desktop/webdev/PronunciationPro2/`
> Status: Production-grade pronunciation assessment pipeline. Not a prototype.
> This codebase dramatically accelerates Phase 3 (AI Coach).

### Server (backend) — Node.js + Express + TypeScript

| File | What it does | Reuse in interactive app |
|---|---|---|
| `server/src/lib/azurePronunciation.ts` | Azure Speech SDK integration. Sends audio, receives per-word accuracy, per-phoneme accuracy, error types, fluency/completeness/prosody scores. Normalizes into typed objects. | Direct reuse. This is the pronunciation engine core. |
| `server/src/lib/spanishCoachRules.ts` | 11 rule-based coaching rules for LatAm Spanish speakers. Detects TH, R, V/B, short I, /æ/, /ʌ/, schwa, final consonants, initial clusters, SH, generic fallback. Generates Spanish coaching (why + tip + practice). | Direct reuse. This is Kyle's pedagogy in code. |
| `server/src/lib/connectedSpeechHeuristics.ts` | Detects connected speech patterns across word boundaries: wanna/gonna/gotta/hafta reductions, C-V linking, V-V glide, flap T, "and" reduction, H-deletion. Spanish coaching for each. | Direct reuse. Advanced feature most apps don't have. |
| `server/src/lib/coachRules.ts` | JSON-driven KB system. Loads and matches word/pair rules from a JSON file. Supports template interpolation (${word}, ${leftWord}). Conservative triggering with accuracy thresholds. | Direct reuse. Extensible without code changes. |
| `server/src/lib/coachRules.es-LatAm.en-US.json` | 1,283-line coaching rulebook. Covers every vowel and consonant sound, linking patterns, reductions. Full Spanish coaching text for each. Human-readable rulebook + executable KB. | Direct reuse. This is a complete pronunciation curriculum as data. |
| `server/src/lib/latam-enus-sounds-guide.v1.json` | 846-line sound guide. Every en-US vowel and consonant with: IPA, likely Spanish substitution, Spanish coaching, minimal pairs, examples, detection hints. | Direct reuse. Feeds the auto-rule generator. |
| `server/src/lib/coachingTips.ts` | KB override system. Per-word coaching overrides for specific reason codes. | Direct reuse. |
| `server/src/lib/guideToKb.ts` | Auto-generates word-level rules from the sounds guide JSON. Vowel threshold: 79, consonant threshold: 69. | Direct reuse. |
| `server/src/lib/audioConvert.ts` | Converts browser audio (webm/mp4) to WAV 16kHz mono for Azure. Uses ffmpeg. | Direct reuse. |
| `server/src/routes/assess.ts` | Express route. Receives audio + reference text, converts, assesses with Azure, applies coaching rules, analyzes connected speech, returns structured JSON response. | Direct reuse. This is the API endpoint. |

### Client (frontend) — React + Vite + TypeScript

| File | What it does | Reuse in interactive app |
|---|---|---|
| `client/src/App.tsx` | Full pronunciation practice UI. Sentence selection, MediaRecorder for mic input, audio playback, score cards, clickable word tokens with color-coded scores, word detail with coaching, connected speech panel, top 3 issues. Spanish UI. | Component reference. Will be rebuilt as a component inside the Next.js app, but the logic and UX patterns are proven. |
| `client/src/api.ts` | TypeScript API client. Full type definitions for assessment response. FormData upload of audio blob. | Direct reuse of types. API call pattern adapted for Next.js. |

### What this means for the build timeline

**Phase 3 (AI Coach) was estimated at 6 slices. With this code, it drops to 3-4 slices:**

| Original slice | New status |
|---|---|
| 22. TPRS circling — question generation | Still needed (new code) |
| 23. TPRS circling — voice recording | **Accelerated**: MediaRecorder pattern proven in PronunciationPro2 |
| 24. TPRS circling — AI feedback | Still needed (new code) |
| 25. Pronunciation assessment | **DONE**: azurePronunciation.ts + spanishCoachRules.ts + connectedSpeechHeuristics.ts + assess route. Needs integration into Next.js, not rewriting. |
| 26. AI Coach dashboard | Still needed (new code, but uses existing assessment data) |

The pronunciation assessment pipeline (the hardest part of Phase 3) is already built and working. What remains is:
1. Port the Express API route into Next.js API routes or a separate microservice
2. Integrate the React component into the story reader (student reads a sentence from the story, clicks "practice pronunciation", records, gets feedback)
3. Display Azure's IPA phonemes with the same IPA the reader already uses. Taught sounds link to Phase 2.5 sound-video popups.

### Architecture decision: monolith vs. microservice

The PronunciationPro2 server is a standalone Express app. Two options for integration:

**Option A: Port into Next.js (recommended for MVP)**
- Move the assess route logic into a Next.js API route
- Move the coaching JSON files into the Next.js project
- One codebase, one deployment
- Risk: Next.js API routes have execution time limits on Vercel free tier (10 seconds). Azure assessment typically takes 2-5 seconds. Should be fine.

**Option B: Keep as microservice**
- Deploy PronunciationPro2 server separately (Railway, Render, Fly.io)
- Next.js app calls it via HTTP
- More moving parts, but cleaner separation
- Better for scaling if pronunciation becomes heavily used

**Recommendation: Start with Option A (port into Next.js). Switch to Option B if Vercel time limits become a problem.**

### Azure phoneme → sound video lookup (needed for Phase 3)

The coaching JSON and the interactive reader both use IPA (θ, ð, ɪ, iː, ʌ, ʊ, ə, ɑ, ɝ, ɚ, etc.). Do not convert Azure output into Kyle's old symbols for display. IPA sounds open the Phase 2.5 Bunny Stream popup via `SoundVideo.ipa` / `ipa_aliases`. Kyle nicknames (`ör`, `ö`, `ü`, etc.) stay on the SoundVideo row for teaching materials only.

| Azure IPA | SoundVideo.ipa | Kyle's name (internal) |
|---|---|---|
| ə | ə | schwa |
| ʌ | ʌ | short u |
| ʊ | ʊ | angry monkey |
| ɑ | ɑ | listerine vowel |
| ɝ / ɚ | ɝ | dog RRRRRRR |
| ɪ | ɪ | short i |
| iː | iː | long e |
| θ | θ | th without vibration |
| ð | ð | th with vibration |
| v | v | viper, vixen |
| z | z | English Z |
| dʒ | dʒ | English J |
