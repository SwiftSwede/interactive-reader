import BrowsingShell from "@/components/shell/BrowsingShell";
import SoundChart from "@/components/sounds/SoundChart";
import { buildSoundChart } from "@/lib/sound-guide";
import { getSoundVideos } from "@/lib/sound-videos";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Los sonidos del inglés americano | Profe Kyle",
  description:
    "Escucha cada sonido del inglés americano. El video está ahí cuando lo quieras.",
};

export default async function SoundsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const videos = await getSoundVideos(supabase);
  const chart = buildSoundChart(videos);

  return (
    <BrowsingShell
      activeTab="herramientas"
      accountHref={user ? "/profile" : "/login"}
      accountLabel={user ? "Perfil" : "Entra"}
    >
      <section className="pt-6">
        <h1 className="text-headline-lg text-text-primary">Guía de sonidos</h1>
        <div className="mt-4">
          <SoundChart chart={chart} />
        </div>
      </section>
    </BrowsingShell>
  );
}
