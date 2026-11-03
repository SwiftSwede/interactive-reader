-- Parallel Zoom rooms inside one level. main is the Stripe default.
-- extra is the other horario. Stripe never writes this column.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS cohort text NOT NULL DEFAULT 'main';

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_cohort_check;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_cohort_check
  CHECK (cohort IN ('main', 'extra'));

COMMENT ON COLUMN public.courses.cohort IS
  'Which parallel room inside this level. main receives Stripe payers. extra starts empty until the teacher moves students.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS classroom_cohort text NOT NULL DEFAULT 'main';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_classroom_cohort_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_classroom_cohort_check
  CHECK (classroom_cohort IN ('main', 'extra'));

COMMENT ON COLUMN public.profiles.classroom_cohort IS
  'Which parallel room inside classroom_level. Default main. Teacher move sets it. Stripe does not.';
