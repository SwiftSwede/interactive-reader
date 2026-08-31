-- Interactive Reader App — Phase 1 Database Schema
-- Run this in the Supabase SQL Editor
-- Based on PRD Section 4: Data Structure
--
-- Catalog map: there is no `lessons` table. Public URL is /lesson/[slug].
-- This `stories` table is the catalog for reader-backed lessons (cuentos,
-- dialogues, Movie Talk, songs, Traducción). Writing lives in
-- writing_prompts. Exams live in exam_prompts. Do not rename this table.
-- Full map: docs/PRD.md Section 4, "Catalog map".

-- ── Stories (reader-backed lesson catalog) ─────────────────

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL DEFAULT 'pre-intermediate' CHECK (level IN ('beginner', 'pre-intermediate', 'intermediate')),
  cefr TEXT NOT NULL DEFAULT 'A2/B1',
  body_text TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Expressions (multi-word units) ─────────────────────────
-- Must be created BEFORE words because words references expressions(id)

CREATE TABLE IF NOT EXISTS expressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  spanish_translation TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  word_ids UUID[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_expressions_story_id ON expressions(story_id);

-- ── Words ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  lemma TEXT NOT NULL DEFAULT '',
  spanish_translation TEXT NOT NULL DEFAULT '',
  phonetic_transcription TEXT NOT NULL DEFAULT '',
  part_of_speech TEXT NOT NULL DEFAULT '',
  audio_url TEXT NOT NULL DEFAULT '',
  expression_id UUID REFERENCES expressions(id) ON DELETE SET NULL,
  is_transparent BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_words_story_id ON words(story_id);
CREATE INDEX IF NOT EXISTS idx_words_expression_id ON words(expression_id);

-- ── Story Audio ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS story_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  voice TEXT NOT NULL DEFAULT 'edge-tts' CHECK (voice IN ('kyle', 'edge-tts', 'openai-tts')),
  duration_seconds INTEGER NOT NULL DEFAULT 0
);

-- ── Comprehension Questions ───────────────────────────────

CREATE TABLE IF NOT EXISTS comprehension_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  level TEXT NOT NULL DEFAULT 'factual' CHECK (level IN ('factual', 'inferential'))
);

CREATE INDEX IF NOT EXISTS idx_comp_questions_story_id ON comprehension_questions(story_id);

-- ── Personal Questions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS personal_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  question TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_questions_story_id ON personal_questions(story_id);

-- ── Pronunciation Drills ───────────────────────────────────

CREATE TABLE IF NOT EXISTS pronunciation_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  symbol_legend TEXT,
  focus_type TEXT NOT NULL DEFAULT 'sounds' CHECK (focus_type IN ('sounds', 'ed-s-rules', 'emphasized-syllable')),
  focus_content TEXT NOT NULL DEFAULT '',
  practica_coral_standard TEXT NOT NULL DEFAULT '',
  practica_coral_phonetic TEXT NOT NULL DEFAULT ''
);

-- ── Sound Videos ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sound_videos (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bunny_video_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 120,
  description TEXT NOT NULL DEFAULT '',
  examples TEXT[] NOT NULL DEFAULT '{}',
  course TEXT NOT NULL DEFAULT ''
);

-- ── Enable Row Level Security ───────────────────────────────
-- Phase 1: stories marked is_free = true are publicly readable.
-- Phase 2: paid users get access to all stories via auth.

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE expressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprehension_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pronunciation_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sound_videos ENABLE ROW LEVEL SECURITY;

-- Phase 1: Allow public read access to free stories and their related data
CREATE POLICY "Public can read free stories"
  ON stories FOR SELECT
  USING (is_free = true);

CREATE POLICY "Public can read words for free stories"
  ON words FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = words.story_id
      AND stories.is_free = true
    )
  );

CREATE POLICY "Public can read expressions for free stories"
  ON expressions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = expressions.story_id
      AND stories.is_free = true
    )
  );

CREATE POLICY "Public can read audio for free stories"
  ON story_audio FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_audio.story_id
      AND stories.is_free = true
    )
  );

CREATE POLICY "Public can read comprehension questions for free stories"
  ON comprehension_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = comprehension_questions.story_id
      AND stories.is_free = true
    )
  );

CREATE POLICY "Public can read personal questions for free stories"
  ON personal_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = personal_questions.story_id
      AND stories.is_free = true
    )
  );

CREATE POLICY "Public can read pronunciation drills for free stories"
  ON pronunciation_drills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = pronunciation_drills.story_id
      AND stories.is_free = true
    )
  );

CREATE POLICY "Public can read sound videos"
  ON sound_videos FOR SELECT
  USING (true);