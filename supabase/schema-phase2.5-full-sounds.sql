-- Interactive Reader App — Phase 2.5 full sound catalog
-- Run this in the Supabase SQL Editor AFTER schema-phase2.5.sql.
--
-- Inserts every General American phoneme used in tooltips and dictation.
-- Does NOT overwrite bunny_video_id, so GUIDs you already pasted stay put.

INSERT INTO public.sound_videos (
  symbol, ipa, ipa_aliases, name, duration_seconds, description, examples, course
) VALUES
  ('i', 'ɪ', '{}', 'Short I', 180, 'The relaxed short i in sit, ship, bit.', ARRAY['sit', 'ship', 'bit'], 'sounds'),
  ('ee', 'iː', ARRAY['i'], 'Long E', 180, 'The tense long e in seat, sheep, beat.', ARRAY['seat', 'sheep', 'need'], 'sounds'),
  ('e', 'ɛ', '{}', 'Short E', 180, 'The short e in bed, red, mess.', ARRAY['bed', 'red', 'mess'], 'sounds'),
  ('a', 'æ', '{}', 'Short A', 180, 'The short a in cat, bag, apple.', ARRAY['cat', 'bag', 'apple'], 'sounds'),
  ('ä', 'ɑ', ARRAY['ɑː', 'ɔ', 'ɔː', 'ɒ'], 'Listerine Vowel', 180, 'The open vowel in not, want, lot, walk, thought, off.', ARRAY['not', 'want', 'lot', 'walk', 'thought'], 'sounds'),
  ('ö', 'ʌ', '{}', 'Short U', 180, 'The short u in but, luck, what.', ARRAY['but', 'luck', 'what'], 'sounds'),
  ('ë', 'ə', '{}', 'Schwa', 180, 'The reduced vowel in a lot of commas.', ARRAY['of', 'a', 'the'], 'sounds'),
  ('ü', 'ʊ', '{}', 'Angry Monkey', 180, 'The vowel in book, would, put, look.', ARRAY['book', 'would', 'put'], 'sounds'),
  ('oo', 'uː', ARRAY['u'], 'Long U', 180, 'The long u in food, too, blue.', ARRAY['food', 'too', 'blue'], 'sounds'),
  ('ör', 'ɝ', ARRAY['ɚ', 'ər', 'ɜr', 'ɜː'], 'Dog RRRRRRR', 210, 'The r-colored vowel in fur, learn, sir.', ARRAY['fur', 'learn', 'sir'], 'sounds'),
  ('ay', 'eɪ', ARRAY['e'], 'AY', 180, 'The diphthong in say, day, name.', ARRAY['say', 'day', 'name'], 'sounds'),
  ('ai', 'aɪ', '{}', 'AI', 180, 'The diphthong in my, time, like.', ARRAY['my', 'time', 'like'], 'sounds'),
  ('oy', 'ɔɪ', '{}', 'OY', 180, 'The diphthong in boy, toy, noise.', ARRAY['boy', 'toy', 'noise'], 'sounds'),
  ('ow', 'aʊ', '{}', 'OW', 180, 'The diphthong in now, house, out.', ARRAY['now', 'house', 'out'], 'sounds'),
  ('oh', 'oʊ', ARRAY['əʊ'], 'OH', 180, 'The diphthong in most, go, boat. Two sounds: O then U.', ARRAY['most', 'go', 'boat'], 'sounds'),
  ('yu', 'juː', ARRAY['ju'], 'YU', 180, 'The you-glide in you, music, cute.', ARRAY['you', 'music', 'cute'], 'sounds'),
  ('ar', 'ɑɹ', ARRAY['ɑr'], 'AR', 180, 'The r-colored vowel in car, far, start.', ARRAY['car', 'far', 'start'], 'sounds'),
  ('or', 'ɔɹ', ARRAY['ɔr'], 'OR', 180, 'The r-colored vowel in more, wore, four.', ARRAY['more', 'wore', 'four'], 'sounds'),
  ('air', 'ɛɹ', ARRAY['ɛr', 'eɹ'], 'AIR', 180, 'The r-colored vowel in their, air, care.', ARRAY['their', 'air', 'care'], 'sounds'),
  ('ear', 'ɪɹ', ARRAY['ɪr', 'ɪə'], 'EAR', 180, 'The r-colored vowel in near, here, beer.', ARRAY['near', 'here', 'beer'], 'sounds'),
  ('ure', 'ʊɹ', ARRAY['ʊr'], 'URE', 180, 'The r-colored vowel in tour and sure.', ARRAY['tour', 'sure'], 'sounds'),
  ('p', 'p', '{}', 'P', 180, 'The P in put, stop, people.', ARRAY['put', 'stop', 'people'], 'sounds'),
  ('b', 'b', '{}', 'B', 180, 'The B in boy, cab, baby.', ARRAY['boy', 'cab', 'baby'], 'sounds'),
  ('t', 't', '{}', 'T', 180, 'The T in top, cat, water.', ARRAY['top', 'cat', 'water'], 'sounds'),
  ('d', 'd', '{}', 'D', 180, 'The D in day, kid, made.', ARRAY['day', 'kid', 'made'], 'sounds'),
  ('k', 'k', '{}', 'K', 180, 'The K in cat, back, school.', ARRAY['cat', 'back', 'school'], 'sounds'),
  ('g', 'g', ARRAY['ɡ'], 'G', 180, 'The G in go, big, give.', ARRAY['go', 'big', 'give'], 'sounds'),
  ('f', 'f', '{}', 'F', 180, 'The F in fun, leaf, coffee.', ARRAY['fun', 'leaf', 'coffee'], 'sounds'),
  ('v', 'v', '{}', 'Viper V', 150, 'English V, not a Spanish B.', ARRAY['viper', 'very', 'have'], 'sounds'),
  ('th', 'θ', '{}', 'TH without vibration', 180, 'The voiceless TH in thing, nothing, both.', ARRAY['thing', 'nothing', 'both'], 'sounds'),
  ('dz', 'ð', '{}', 'TH with vibration', 180, 'The voiced TH in this, that, those.', ARRAY['this', 'that', 'the'], 'sounds'),
  ('s', 's', '{}', 'S', 180, 'The S in sit, miss, city.', ARRAY['sit', 'miss', 'city'], 'sounds'),
  ('z', 'z', '{}', 'English Z', 150, 'The buzzing S/Z in kids, loves, bridges.', ARRAY['kids', 'loves', 'is'], 'sounds'),
  ('sh', 'ʃ', '{}', 'SH', 180, 'The SH in she, fish, nation.', ARRAY['she', 'fish', 'nation'], 'sounds'),
  ('zh', 'ʒ', '{}', 'ZH', 180, 'The ZH in vision, measure, beige.', ARRAY['vision', 'measure', 'beige'], 'sounds'),
  ('h', 'h', '{}', 'H', 180, 'The H in hat, hello, who.', ARRAY['hat', 'hello', 'who'], 'sounds'),
  ('ch', 'tʃ', '{}', 'CH', 180, 'The CH in chair, watch, church.', ARRAY['chair', 'watch', 'church'], 'sounds'),
  ('dy', 'dʒ', '{}', 'English J', 180, 'The J sound in Jill, jump, jersey.', ARRAY['Jill', 'jump', 'jersey'], 'sounds'),
  ('m', 'm', '{}', 'M', 180, 'The M in me, time, summer.', ARRAY['me', 'time', 'summer'], 'sounds'),
  ('n', 'n', '{}', 'N', 180, 'The N in no, sun, funny.', ARRAY['no', 'sun', 'funny'], 'sounds'),
  ('ng', 'ŋ', '{}', 'NG', 180, 'The NG in sing, think, long.', ARRAY['sing', 'think', 'long'], 'sounds'),
  ('l', 'l', '{}', 'L', 180, 'The light L in like, love, light.', ARRAY['like', 'love', 'light'], 'sounds'),
  ('...l', 'ɫ', ARRAY['l̩'], 'Dark L', 180, 'The dark L in girl, will, fill, world.', ARRAY['girl', 'will', 'world'], 'sounds'),
  ('r', 'ɹ', ARRAY['r'], 'R', 180, 'The English R in red, right, very.', ARRAY['red', 'right', 'very'], 'sounds'),
  ('w', 'w', '{}', 'W', 180, 'The W in we, went, always.', ARRAY['we', 'went', 'always'], 'sounds'),
  ('y', 'j', '{}', 'Y', 180, 'The Y in yes, you, yellow.', ARRAY['yes', 'you', 'yellow'], 'sounds'),
  ('''', 'ʔ', '{}', 'Glottal Stop', 150, 'The catch in tha button, mountain, Manhattan.', ARRAY['button', 'mountain'], 'sounds')
ON CONFLICT (symbol) DO UPDATE SET
  ipa = EXCLUDED.ipa,
  ipa_aliases = EXCLUDED.ipa_aliases,
  name = EXCLUDED.name,
  duration_seconds = EXCLUDED.duration_seconds,
  description = EXCLUDED.description,
  examples = EXCLUDED.examples,
  course = EXCLUDED.course;
