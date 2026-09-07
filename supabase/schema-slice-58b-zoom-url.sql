-- Slice 58b: monthly Zoom room URL on the group (course), not per session.
-- RLS unchanged: teachers UPDATE own courses; enrolled students SELECT their courses.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS zoom_url TEXT;

COMMENT ON COLUMN public.courses.zoom_url IS
  'Monthly Zoom room URL for this group. Same room for all sessions in the month.';
