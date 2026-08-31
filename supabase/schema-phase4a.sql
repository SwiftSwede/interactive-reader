-- Interactive Reader App — Phase 4a Database Schema (Slice 36: content tagging)
-- Run this in the Supabase SQL Editor AFTER schema-phase2c.sql
--
-- Knowledge graph tags from PRD Section 4. The tags are about language, not
-- stories. The junction is polymorphic so any content type can be tagged.
-- For Phase 4 every content_tags row has content_type = 'story'.

-- ── Tag catalogs ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.grammar_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  prerequisites UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vocabulary_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phonetic_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Story kind (dialogues and Movie Talks share the reader) ─
-- Display only. ContentTag.content_type stays 'story' for all kinds.

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'story';

ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_kind_check;

ALTER TABLE public.stories
  ADD CONSTRAINT stories_kind_check
  CHECK (kind IN ('story', 'dialogue', 'movie_talk'));

-- ── ContentTag (polymorphic junction) ──────────────────────
-- content_id has no FK: it points at stories, writing_prompts, or
-- exam_prompts depending on content_type. The app layer validates it.

CREATE TABLE IF NOT EXISTS public.content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL
    CHECK (content_type IN ('story', 'writing_prompt', 'exam_prompt')),
  content_id UUID NOT NULL,
  tag_type TEXT NOT NULL
    CHECK (tag_type IN ('grammar', 'vocabulary', 'phonetic')),
  tag_id UUID NOT NULL,
  coverage_level TEXT NOT NULL DEFAULT 'introduced'
    CHECK (coverage_level IN ('introduced', 'reinforced', 'mastered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id, tag_type, tag_id)
);

-- "which content covers present_perfect?" runs on this index
CREATE INDEX IF NOT EXISTS idx_content_tags_tag
  ON public.content_tags(tag_type, tag_id);

CREATE INDEX IF NOT EXISTS idx_content_tags_content
  ON public.content_tags(content_type, content_id);

-- ── Row Level Security ─────────────────────────────────────
-- Tag catalogs and the junction are catalog data: world-readable.
-- Writes go through the service role (seed scripts), never the browser.

ALTER TABLE public.grammar_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phonetic_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read grammar tags" ON public.grammar_tags;
CREATE POLICY "Anyone can read grammar tags"
  ON public.grammar_tags FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can read vocabulary tags" ON public.vocabulary_tags;
CREATE POLICY "Anyone can read vocabulary tags"
  ON public.vocabulary_tags FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can read phonetic tags" ON public.phonetic_tags;
CREATE POLICY "Anyone can read phonetic tags"
  ON public.phonetic_tags FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can read content tags" ON public.content_tags;
CREATE POLICY "Anyone can read content tags"
  ON public.content_tags FOR SELECT
  USING (true);

-- ── Grants ─────────────────────────────────────────────────
-- SELECT only. No INSERT/UPDATE/DELETE for anon or authenticated.

GRANT SELECT ON public.grammar_tags TO authenticated, anon;
GRANT SELECT ON public.vocabulary_tags TO authenticated, anon;
GRANT SELECT ON public.phonetic_tags TO authenticated, anon;
GRANT SELECT ON public.content_tags TO authenticated, anon;
