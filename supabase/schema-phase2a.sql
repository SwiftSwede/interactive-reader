-- Interactive Reader App — Phase 2a Database Schema
-- Run this in the Supabase SQL Editor AFTER schema-phase1.sql
-- Based on PRD Section 4. Does not replace Phase 1 tables.
--
-- Auth setup (Dashboard > Authentication):
--   Site URL: http://localhost:3000 (prod: https://learn.profekyle.com)
--   Redirect URLs: http://localhost:3000/auth/callback, https://learn.profekyle.com/auth/callback
--   Enable Email OTP / magic link
--
-- Slices 14–15 (Stripe webhooks) are deferred. subscription_periods exists
-- so we do not migrate later. Lifecycle is not enforced until those slices.

-- ── Profiles (PRD User entity; id matches auth.users) ──────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student-consumer'
    CHECK (role IN ('student-classroom', 'student-consumer', 'teacher')),
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'none'
    CHECK (subscription_status IN ('active', 'cancelled', 'paused', 'none')),
  purchased BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, subscription_status)
  VALUES (NEW.id, NEW.email, 'student-consumer', 'none')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Subscription periods (Slice 15: schema now, logic later) ─

CREATE TABLE IF NOT EXISTS public.subscription_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'paused'))
);

CREATE INDEX IF NOT EXISTS idx_subscription_periods_user_id
  ON public.subscription_periods(user_id);

-- ── Courses ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('pre-intermediate', 'intermediate')),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON public.courses(teacher_id);

-- ── Enrollments ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  display_name TEXT NOT NULL DEFAULT '',
  UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id
  ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id
  ON public.course_enrollments(student_id);

-- ── Course sessions ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id),
  session_date DATE NOT NULL,
  session_start_time TIMESTAMPTZ NOT NULL,
  session_end_time TIMESTAMPTZ NOT NULL,
  answers_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  session_link_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_sessions_course_id
  ON public.course_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_token
  ON public.course_sessions(session_link_token);

-- ── Attendance ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_session_id UUID NOT NULL REFERENCES public.course_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT FALSE,
  first_opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_session_attendance_session_id
  ON public.session_attendance(course_session_id);

-- ── Comprehension responses ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.comprehension_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comprehension_question_id UUID NOT NULL REFERENCES public.comprehension_questions(id) ON DELETE CASCADE,
  course_session_id UUID REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  response_text TEXT NOT NULL DEFAULT '',
  revealed_answer BOOLEAN NOT NULL DEFAULT FALSE,
  revealed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, comprehension_question_id, course_session_id)
);

CREATE INDEX IF NOT EXISTS idx_comprehension_responses_user_id
  ON public.comprehension_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_comprehension_responses_session_id
  ON public.comprehension_responses(course_session_id);

-- ── Helpers (after tables exist) ───────────────────────────

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_classroom_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'student-classroom'
  );
$$;

CREATE OR REPLACE FUNCTION public.teacher_owns_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = p_course_id AND student_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_story(p_story_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stories s
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
      )
  );
$$;

-- Token lookup for Zoom links before the student is enrolled (Slice 19)
CREATE OR REPLACE FUNCTION public.get_session_by_token(p_token text)
RETURNS SETOF public.course_sessions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.course_sessions
  WHERE session_link_token = p_token
  LIMIT 1;
$$;

-- ── Row Level Security ─────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprehension_responses ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_teacher());

-- Subscription periods: own row, or teacher
CREATE POLICY "Users can read own subscription periods"
  ON public.subscription_periods FOR SELECT
  USING (user_id = auth.uid() OR public.is_teacher());

-- Courses
CREATE POLICY "Teachers can manage own courses"
  ON public.courses FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Enrolled students can read their courses"
  ON public.courses FOR SELECT
  USING (public.is_enrolled_in_course(id));

-- Enrollments
CREATE POLICY "Teachers can manage enrollments on own courses"
  ON public.course_enrollments FOR ALL
  USING (public.teacher_owns_course(course_id))
  WITH CHECK (public.teacher_owns_course(course_id));

CREATE POLICY "Students can read own enrollments"
  ON public.course_enrollments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Classroom students can self-enroll"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND public.is_classroom_student()
  );

-- Sessions
CREATE POLICY "Teachers can manage sessions on own courses"
  ON public.course_sessions FOR ALL
  USING (public.teacher_owns_course(course_id))
  WITH CHECK (public.teacher_owns_course(course_id));

CREATE POLICY "Enrolled students can read course sessions"
  ON public.course_sessions FOR SELECT
  USING (public.is_enrolled_in_course(course_id));

-- Attendance
CREATE POLICY "Teachers can read attendance on own courses"
  ON public.session_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  );

CREATE POLICY "Students can read own attendance"
  ON public.session_attendance FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert own attendance"
  ON public.session_attendance FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own attendance"
  ON public.session_attendance FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Comprehension responses
CREATE POLICY "Teachers can read responses on own courses"
  ON public.comprehension_responses FOR SELECT
  USING (
    course_session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.course_sessions cs
      WHERE cs.id = course_session_id
        AND public.teacher_owns_course(cs.course_id)
    )
  );

CREATE POLICY "Students can manage own comprehension responses"
  ON public.comprehension_responses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Classroom / teacher access to non-free story content (Phase 1 policies stay)
CREATE POLICY "Assigned readers can read stories"
  ON public.stories FOR SELECT
  USING (public.can_read_story(id));

CREATE POLICY "Assigned readers can read words"
  ON public.words FOR SELECT
  USING (public.can_read_story(story_id));

CREATE POLICY "Assigned readers can read expressions"
  ON public.expressions FOR SELECT
  USING (public.can_read_story(story_id));

CREATE POLICY "Assigned readers can read audio"
  ON public.story_audio FOR SELECT
  USING (public.can_read_story(story_id));

CREATE POLICY "Assigned readers can read comprehension questions"
  ON public.comprehension_questions FOR SELECT
  USING (public.can_read_story(story_id));

CREATE POLICY "Assigned readers can read personal questions"
  ON public.personal_questions FOR SELECT
  USING (public.can_read_story(story_id));

CREATE POLICY "Assigned readers can read pronunciation drills"
  ON public.pronunciation_drills FOR SELECT
  USING (public.can_read_story(story_id));

-- ── Grants ─────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.subscription_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprehension_responses TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_student() TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_owns_course(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_enrolled_in_course(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_story(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_session_by_token(text) TO authenticated;

-- Backfill profiles for users who signed up before this migration ran
INSERT INTO public.profiles (id, email, role, subscription_status)
SELECT id, email, 'student-consumer', 'none'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
