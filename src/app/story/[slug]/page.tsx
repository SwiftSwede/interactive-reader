import { createClient } from "@/lib/supabase/server";
import { getStoryBySlug } from "@/lib/stories";
import { resolveSessionAccess } from "@/lib/sessions";
import { loadOwnComprehensionResponses } from "@/lib/comprehension";
import StoryReader from "@/components/StoryReader";
import StoryAccessMessage from "@/components/StoryAccessMessage";

export default async function StorySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;
  const { session } = await searchParams;
  const access = await resolveSessionAccess(slug, session);

  if (access.kind === "invalid") {
    return (
      <StoryAccessMessage
        title="Ese link no sirve"
        body="Pídele el link de clase al Profe Kyle. A veces se copia mal, o ya no es de esta historia."
      />
    );
  }

  if (access.kind === "refused") {
    return (
      <StoryAccessMessage
        title="Este link es para el grupo"
        body="Si pagaste el curso, pídele al Profe Kyle que te invite con tu email. Después el mismo link te deja entrar."
      />
    );
  }

  const supabase = await createClient();
  const data = await getStoryBySlug(supabase, slug);

  if (!data) {
    return (
      <StoryAccessMessage
        title="No encontré esa historia"
        body="Revisa el link o pídeselo otra vez al Profe Kyle."
      />
    );
  }

  const allowReveal = access.kind === "open" || access.allowReveal;
  const unlockAt =
    access.kind === "ok" && !access.allowReveal
      ? access.session.sessionEndTime
      : undefined;
  const sessionId =
    access.kind === "ok" && access.saveResponses ? access.session.id : undefined;
  const savedResponses = sessionId
    ? await loadOwnComprehensionResponses(sessionId)
    : undefined;

  return (
    <StoryReader
      data={data}
      allowReveal={allowReveal}
      unlockAt={unlockAt}
      sessionId={sessionId}
      savedResponses={savedResponses}
    />
  );
}
