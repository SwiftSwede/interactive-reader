-- schema-phase5-video-summary.sql
-- Run on Supabase: psql or SQL Editor
-- Adds video_summary support: new Story columns + 3 new tables

-- 1. Add columns to stories table
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS spanish_summary text,
  ADD COLUMN IF NOT EXISTS free_write_minutes integer DEFAULT 5;

-- 1b. Update the kind CHECK constraint to include 'video_summary'
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_kind_check;
ALTER TABLE stories ADD CONSTRAINT stories_kind_check
  CHECK (kind IN ('story', 'dialogue', 'movie_talk', 'song', 'video_summary'));

-- 2. VideoSummaryParagraph — one paragraph of the Spanish summary with teacher's live English translation
CREATE TABLE IF NOT EXISTS video_summary_paragraphs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  spanish_text text NOT NULL,
  english_translation text,
  translation_started_at timestamptz,
  translation_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, position)
);

CREATE INDEX IF NOT EXISTS idx_vsp_story ON video_summary_paragraphs(story_id);
CREATE INDEX IF NOT EXISTS idx_vsp_position ON video_summary_paragraphs(story_id, position);

-- 3. VideoSummaryFreeWrite — student's 5-minute free writing summary of the video
CREATE TABLE IF NOT EXISTS video_summary_free_writes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_session_id uuid REFERENCES course_sessions(id) ON DELETE SET NULL,
  submission_text text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  elapsed_seconds integer DEFAULT 0,
  word_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vsfw_story ON video_summary_free_writes(story_id);
CREATE INDEX IF NOT EXISTS idx_vsfw_session ON video_summary_free_writes(course_session_id);
CREATE INDEX IF NOT EXISTS idx_vsfw_user ON video_summary_free_writes(user_id);

-- 4. VideoSummaryTeachingNote — teacher's inline word/phrase flags, created live during class
CREATE TABLE IF NOT EXISTS video_summary_teaching_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  course_session_id uuid NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
  paragraph_position integer NOT NULL DEFAULT 0,
  selected_text text NOT NULL,
  note text NOT NULL DEFAULT '',
  note_type text NOT NULL DEFAULT 'vocabulary' CHECK (note_type IN ('vocabulary', 'grammar', 'pronunciation', 'cultural')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vstn_session ON video_summary_teaching_notes(course_session_id);
CREATE INDEX IF NOT EXISTS idx_vstn_paragraph ON video_summary_teaching_notes(course_session_id, paragraph_position);

-- 5. Session type: video_summary uses story_id (same shape as story)
ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_session_type_check;

ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_session_type_check
  CHECK (session_type IN ('story', 'writing', 'exam', 'video_summary'));

ALTER TABLE public.course_sessions
  DROP CONSTRAINT IF EXISTS course_sessions_activity_check;

ALTER TABLE public.course_sessions
  ADD CONSTRAINT course_sessions_activity_check
  CHECK (
    (
      session_type = 'story'
      AND story_id IS NOT NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
    )
    OR
    (
      session_type = 'writing'
      AND writing_prompt_id IS NOT NULL
      AND story_id IS NULL
      AND exam_prompt_id IS NULL
    )
    OR
    (
      session_type = 'exam'
      AND exam_prompt_id IS NOT NULL
      AND story_id IS NULL
      AND writing_prompt_id IS NULL
    )
    OR
    (
      session_type = 'video_summary'
      AND story_id IS NOT NULL
      AND writing_prompt_id IS NULL
      AND exam_prompt_id IS NULL
    )
  );

-- 6. Enable Realtime (teacher typing → student screens)
ALTER TABLE video_summary_paragraphs REPLICA IDENTITY FULL;
ALTER TABLE video_summary_free_writes REPLICA IDENTITY FULL;
ALTER TABLE video_summary_teaching_notes REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.video_summary_paragraphs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.video_summary_teaching_notes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 7. RLS Policies

-- video_summary_paragraphs: teacher can write (translation), students can read
ALTER TABLE video_summary_paragraphs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vsp_read_all" ON video_summary_paragraphs
  FOR SELECT USING (true);

CREATE POLICY "vsp_write_teacher" ON video_summary_paragraphs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

-- video_summary_free_writes: students write their own, teacher reads all
ALTER TABLE video_summary_free_writes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vsfw_student_own" ON video_summary_free_writes
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "vsfw_teacher_read" ON video_summary_free_writes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

-- video_summary_teaching_notes: teacher creates/reads, students read
ALTER TABLE video_summary_teaching_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vstn_read_all" ON video_summary_teaching_notes
  FOR SELECT USING (true);

CREATE POLICY "vstn_write_teacher" ON video_summary_teaching_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );
