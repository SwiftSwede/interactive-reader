-- Teaching stays live until the teacher ends class (or a 4-hour overtime cap).
-- Teaching notes remember whether they were marked on Spanish or English.

ALTER TABLE public.course_sessions
  ADD COLUMN IF NOT EXISTS class_ended_at TIMESTAMPTZ;

COMMENT ON COLUMN public.course_sessions.class_ended_at IS
  'When the teacher ended class. Null means teaching continues after the scheduled 90-min window until this is set, or until four hours after session_end_time.';

UPDATE public.course_sessions
SET class_ended_at = session_end_time
WHERE class_ended_at IS NULL
  AND session_end_time < now();

ALTER TABLE public.video_summary_teaching_notes
  ADD COLUMN IF NOT EXISTS text_side text NOT NULL DEFAULT 'spanish';

ALTER TABLE public.video_summary_teaching_notes
  DROP CONSTRAINT IF EXISTS video_summary_teaching_notes_text_side_check;

ALTER TABLE public.video_summary_teaching_notes
  ADD CONSTRAINT video_summary_teaching_notes_text_side_check
  CHECK (text_side IN ('spanish', 'english'));

UPDATE public.video_summary_teaching_notes AS note
SET text_side = 'english'
FROM public.video_summary_paragraphs AS paragraph
WHERE paragraph.story_id = note.story_id
  AND paragraph.position = note.paragraph_position
  AND position(note.selected_text IN coalesce(paragraph.spanish_text, '')) = 0
  AND position(note.selected_text IN coalesce(paragraph.english_translation, '')) > 0;
