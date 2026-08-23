import { supabase } from "@/lib/supabase";
import { getFreeStory } from "@/lib/stories";
import StoryReader from "@/components/StoryReader";

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
