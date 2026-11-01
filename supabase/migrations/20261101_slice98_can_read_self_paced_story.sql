-- Slice 98: self-paced lessons (e.g. Iplo audio_course) were gated in app code
-- but stories SELECT still used can_read_story, which only checked course_sessions.
-- Enrolled or purchased self-paced course_lessons must be readable.

CREATE OR REPLACE FUNCTION public.can_read_story(p_story_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stories s
    WHERE s.id = p_story_id
      AND (
        s.is_free = true
        OR public.is_teacher()
        OR EXISTS (
          SELECT 1
          FROM public.course_sessions cs
          JOIN public.course_enrollments ce ON ce.course_id = cs.course_id
          WHERE cs.story_id = p_story_id
            AND ce.student_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.course_lessons cl
          JOIN public.courses c ON c.id = cl.course_id
          JOIN public.course_enrollments ce
            ON ce.course_id = c.id AND ce.student_id = auth.uid()
          WHERE cl.story_id = p_story_id
            AND c.format = 'self_paced'
            AND c.is_published = true
            AND COALESCE(c.archived, false) = false
        )
        OR EXISTS (
          SELECT 1
          FROM public.course_lessons cl
          JOIN public.courses c ON c.id = cl.course_id
          JOIN public.product_items pi
            ON pi.item_type = 'course' AND pi.course_id = c.id
          JOIN public.purchases p
            ON p.product_id = pi.product_id AND p.user_id = auth.uid()
          WHERE cl.story_id = p_story_id
            AND c.format = 'self_paced'
            AND c.is_published = true
            AND COALESCE(c.archived, false) = false
        )
        OR EXISTS (
          SELECT 1
          FROM public.course_lessons cl
          JOIN public.courses c ON c.id = cl.course_id
          JOIN public.product_items pi
            ON pi.item_type = 'level_library' AND pi.level = c.level
          JOIN public.purchases p
            ON p.product_id = pi.product_id AND p.user_id = auth.uid()
          WHERE cl.story_id = p_story_id
            AND c.format = 'self_paced'
            AND c.is_published = true
            AND COALESCE(c.archived, false) = false
            AND c.level IS DISTINCT FROM 'pronunciation'
        )
      )
  );
$$;

COMMENT ON FUNCTION public.can_read_story(uuid) IS
  'RLS helper: free stories, teachers, group session assignments, and self-paced course_lessons with enrollment or purchase grant.';
