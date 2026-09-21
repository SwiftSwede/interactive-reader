import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadStoryForEdit } from "@/lib/content-editor";
import StoryEditor from "@/components/teacher/content/StoryEditor";

export const metadata = {
  title: "Editar lección - Profe Kyle",
};

export default async function EditStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireTeacher("/teacher");
  const data = await loadStoryForEdit(createAdminClient(), decodeURIComponent(slug));
  if (!data) notFound();

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">{data.story.title}</h1>
      <div className="mt-8">
        <StoryEditor data={data} />
      </div>
    </section>
  );
}
