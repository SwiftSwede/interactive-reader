-- Catalog map comments (discoverability in the Supabase Table Editor).
-- There is no `lessons` table. Full map: docs/PRD.md Section 4.

COMMENT ON TABLE public.stories IS
  'Reader-backed lesson catalog (cuentos, dialogues, Movie Talk, songs, Traducción). Public URL: /lesson/[slug]. There is no lessons table. Writing is writing_prompts. Exams are exam_prompts. Do not rename. See docs/PRD.md Section 4 Catalog map.';

COMMENT ON TABLE public.writing_prompts IS
  'Writing-class prompts. Public URL: /writing?session=. Not stored in stories.';

COMMENT ON TABLE public.exam_prompts IS
  'Group exam prompts. Public URL: /exam?session=. Not stored in stories.';
