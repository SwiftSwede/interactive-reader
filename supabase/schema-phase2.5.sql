-- Interactive Reader App — Phase 2.5
-- Pronunciation videos, IPA lookup, choral practice completions.
-- Run this in the Supabase SQL Editor AFTER schema-phase2c.sql.
--
-- Bunny video GUIDs are left empty until Kyle pastes them.
-- Fill sound_videos.bunny_video_id, then set NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID.

-- ── Sound videos: IPA is the app lookup key ────────────────
-- The original 14 rows below are the Spanish-speaker trouble sounds.
-- The full inventory is in schema-phase2.5-full-sounds.sql. Run that next.
-- It does not overwrite bunny_video_id.

ALTER TABLE public.sound_videos
  ADD COLUMN IF NOT EXISTS ipa TEXT NOT NULL DEFAULT '';

ALTER TABLE public.sound_videos
  ADD COLUMN IF NOT EXISTS ipa_aliases TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.sound_videos
  ALTER COLUMN bunny_video_id SET DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS sound_videos_ipa_key
  ON public.sound_videos (ipa)
  WHERE ipa <> '';

INSERT INTO public.sound_videos (
  symbol, ipa, ipa_aliases, name, bunny_video_id, duration_seconds, description, examples, course
) VALUES
  ('i', 'ɪ', '{}', 'Short I', '', 180, 'The relaxed short i in sit, ship, bit.', ARRAY['sit', 'ship', 'bit'], 'sounds'),
  ('ee', 'iː', '{}', 'Long E', '', 180, 'The tense long e in seat, sheep, beat.', ARRAY['seat', 'sheep', 'need'], 'sounds'),
  ('ë', 'ə', '{}', 'Schwa', '', 180, 'The reduced vowel in a lot of commas.', ARRAY['of', 'a', 'the'], 'sounds'),
  ('ö', 'ʌ', '{}', 'Short U', '', 180, 'The short u in but, luck, what.', ARRAY['but', 'luck', 'what'], 'sounds'),
  ('ü', 'ʊ', '{}', 'Angry Monkey', '', 180, 'The vowel in book, would, put, look.', ARRAY['book', 'would', 'put'], 'sounds'),
  ('ä', 'ɑ', '{}', 'Listerine Vowel', '', 180, 'The open vowel in not, want, lot.', ARRAY['not', 'want', 'lot'], 'sounds'),
  ('ör', 'ɝ', ARRAY['ɚ', 'ər', 'ɜr'], 'Dog RRRRRRR', '', 210, 'The r-colored vowel in fur, learn, sir.', ARRAY['fur', 'learn', 'sir'], 'sounds'),
  ('th', 'θ', '{}', 'TH without vibration', '', 180, 'The voiceless TH in thing, nothing, both.', ARRAY['thing', 'nothing', 'both'], 'sounds'),
  ('dz', 'ð', '{}', 'TH with vibration', '', 180, 'The voiced TH in this, that, those.', ARRAY['this', 'that', 'the'], 'sounds'),
  ('...l', 'ɫ', ARRAY['l̩'], 'Dark L', '', 180, 'The dark L in girl, will, fill, world.', ARRAY['girl', 'will', 'world'], 'sounds'),
  ('''', 'ʔ', '{}', 'Glottal Stop', '', 150, 'The catch in tha button, mountain, Manhattan.', ARRAY['button', 'mountain'], 'sounds'),
  ('v', 'v', '{}', 'Viper V', '', 150, 'English V, not a Spanish B.', ARRAY['viper', 'very', 'have'], 'sounds'),
  ('z', 'z', '{}', 'English Z', '', 150, 'The buzzing S/Z in kids, loves, bridges.', ARRAY['kids', 'loves', 'is'], 'sounds'),
  ('dy', 'dʒ', '{}', 'English J', '', 180, 'The J sound in Jill, jump, jersey.', ARRAY['Jill', 'jump', 'jersey'], 'sounds')
ON CONFLICT (symbol) DO UPDATE SET
  ipa = EXCLUDED.ipa,
  ipa_aliases = EXCLUDED.ipa_aliases,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  examples = EXCLUDED.examples,
  course = EXCLUDED.course;

-- Full inventory (vowels, diphthongs, consonants) lives in src/lib/sound-catalog.ts.
-- The reader merges that catalog at runtime; seed-phase2.5 persists it to this table.

-- ── Pronunciation drills: student-facing IPA + notes ───────

ALTER TABLE public.pronunciation_drills
  ADD COLUMN IF NOT EXISTS practica_coral_ipa TEXT NOT NULL DEFAULT '';

ALTER TABLE public.pronunciation_drills
  ADD COLUMN IF NOT EXISTS word_notes JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.pronunciation_drills
  ADD COLUMN IF NOT EXISTS coral_audio_url TEXT NOT NULL DEFAULT '';

UPDATE public.pronunciation_drills pd
SET
  practica_coral_standard = 'Most of the other kids wore their Messi jersey.',
  practica_coral_ipa = '/moʊst əv ði ˈʌðər kɪdz wɔɹ ðɛɹ ˈmɛsi ˈdʒɝzi/',
  coral_audio_url = '/audio/stories/practica-coral-soccery-jersey.mp3',
  word_notes = '[
    {"word":"Most","note":"El sonido O en ingles es un diptongo, no un sonido simple como en espanol. Tienen que ser dos sonidos juntos: O-U. Si lo pronuncias como la O del espanol, sonara raro."},
    {"word":"Of","note":"Antes de una palabra que empieza con consonante, se reduce a solo la schwa. Por eso suena mosta, no most of."},
    {"word":"The","note":"La vocal de the normalmente se reduce, pero aqui, como la siguiente palabra empieza con vocal, suena como thee. Ademas, para no hacer una pausa entre thee y other, anadimos una Y que conecta las dos palabras. Suena the-y-other. El th tiene vibracion, no es como la z del espanol."},
    {"word":"Kids","note":"La S final suena como Z, no como S. La I de kids es una I corta, como en bit."},
    {"word":"Wore","note":"Igual que most, asegurate de que sea un diptongo: O-U. Si pronuncias la O como en espanol, sonara ligeramente mal."},
    {"word":"Their","note":"Igual que the, el th tiene vibracion. Messi se pronuncia igual en ingles y espanol."},
    {"word":"Jersey","note":"Empieza con el sonido suave de la G (como en jinete). No pronuncies la primera E como si fuera una E del espanol. La S final suena como Z, y termina en un sonido de E."}
  ]'::jsonb
FROM public.stories s
WHERE pd.story_id = s.id
  AND s.slug = 'the-soccer-jersey';

-- ── Choral practice completions ────────────────────────────

CREATE TABLE IF NOT EXISTS public.choral_practice_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  rounds_completed INTEGER NOT NULL DEFAULT 5,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_choral_completions_user_id
  ON public.choral_practice_completions (user_id);

CREATE INDEX IF NOT EXISTS idx_choral_completions_story_id
  ON public.choral_practice_completions (story_id);

ALTER TABLE public.choral_practice_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read own choral completions"
  ON public.choral_practice_completions;
CREATE POLICY "Students can read own choral completions"
  ON public.choral_practice_completions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own choral completions"
  ON public.choral_practice_completions;
CREATE POLICY "Students can insert own choral completions"
  ON public.choral_practice_completions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own choral completions"
  ON public.choral_practice_completions;
CREATE POLICY "Students can update own choral completions"
  ON public.choral_practice_completions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.choral_practice_completions TO authenticated;
