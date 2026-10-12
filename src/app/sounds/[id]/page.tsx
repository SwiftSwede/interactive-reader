import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import BrowsingShell from "@/components/shell/BrowsingShell";
import SoundExamples from "@/components/sounds/SoundExamples";
import SoundVideoFrame from "@/components/SoundVideoFrame";
import { documentTitle } from "@/lib/page-title";
import {
  allSoundSlugs,
  soundCellBySlug,
} from "@/lib/sound-guide";
import { getSoundVideos } from "@/lib/sound-videos";
import { createClient } from "@/lib/supabase/server";

export function generateStaticParams() {
  return allSoundSlugs().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cell = soundCellBySlug(id);
  return {
    title: documentTitle(cell?.name ?? "Sonido"),
    description: cell
      ? `Cómo hacer el sonido ${cell.ipa}.`
      : "Un sonido del inglés americano.",
  };
}

export default async function SoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const videos = await getSoundVideos(supabase);
  const cell = soundCellBySlug(id, videos);
  if (!cell) notFound();

  const examples = cell.exampleWords;

  return (
    <BrowsingShell
      activeTab="herramientas"
      accountHref={user ? "/profile" : "/login"}
      accountLabel={user ? "Perfil" : "Entra"}
    >
      <section className="pt-6 pb-8">
        <BackLink href="/sounds" label="Guía de sonidos" showLabel />
        <h1 className="mt-4 ipa-text text-headline-lg text-text-primary">
          {cell.ipa}
        </h1>
        <p className="mt-1 text-headline-md text-text-primary">{cell.name}</p>
        {cell.coach?.nameEs ? (
          <p className="mt-1 text-label-md text-text-secondary">
            {cell.coach.nameEs}
          </p>
        ) : null}

        <div className="mt-6">
          <SoundVideoFrame video={cell.video} autoplay={false} />
        </div>

        {cell.coach ? (
          <div className="mt-8 flex flex-col gap-6">
            <CoachBlock title="Por qué" body={cell.coach.why} />
            <CoachBlock title="Cómo hacerlo" body={cell.coach.tip} />
            <CoachBlock title="Practica" body={cell.coach.practice} />
            {cell.coach.substitutions.length > 0 ? (
              <div>
                <h2 className="text-headline-md text-text-primary">
                  En español dices…
                </h2>
                <p className="mt-2 text-body-main text-text-secondary">
                  {cell.coach.substitutions.join(", ")}
                </p>
              </div>
            ) : null}
          </div>
        ) : cell.video.description ? (
          <p className="mt-8 text-body-main text-text-secondary">
            {cell.video.description}
          </p>
        ) : null}

        {examples.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-headline-md text-text-primary">Ejemplos</h2>
            <SoundExamples words={examples} />
          </div>
        ) : null}
      </section>
    </BrowsingShell>
  );
}

function CoachBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-headline-md text-text-primary">{title}</h2>
      <p className="mt-2 text-body-main text-text-secondary">{body}</p>
    </div>
  );
}
