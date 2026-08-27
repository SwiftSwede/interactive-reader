-- Merge Kyle's ɑ/ɔ vowel into one sound (Listerine / ä).
-- Run once in Supabase SQL Editor after sound_videos is populated.
-- Safe: keeps bunny_video_id on ä; old transcriptions with ɔ still open that video via aliases.

UPDATE public.sound_videos
SET
  ipa_aliases = ARRAY['ɑː', 'ɔ', 'ɔː', 'ɒ'],
  description = 'The open vowel in not, want, lot, walk, thought, off.',
  examples = ARRAY['not', 'want', 'lot', 'walk', 'thought']
WHERE symbol = 'ä';

DELETE FROM public.sound_videos
WHERE symbol = 'aw';
