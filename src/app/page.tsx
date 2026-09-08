import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { getFreeStory } from "@/lib/stories";
import { documentTitle, freeStoryTitle } from "@/lib/page-title";
import StoryReader from "@/components/StoryReader";

export async function generateMetadata(): Promise<Metadata> {
  const title = await freeStoryTitle();
  return { title: documentTitle(title) };
}

export default async function HomePage() {
  const data = supabase ? await getFreeStory(supabase) : null;

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-gray-500">
          No se pudo cargar la historia. Verifica la conexion a la base de datos.
        </p>
      </main>
    );
  }

  return <StoryReader data={data} />;
}
