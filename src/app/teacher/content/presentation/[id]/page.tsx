import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPresentationForEdit } from "@/lib/content-editor";
import PresentationEditor from "@/components/teacher/content/PresentationEditor";

export const metadata = {
  title: "Editar presentación - Profe Kyle",
};

export default async function EditPresentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTeacher("/teacher");
  const prompt = await loadPresentationForEdit(createAdminClient(), id);
  if (!prompt) notFound();

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">{prompt.title}</h1>
      <div className="mt-8">
        <PresentationEditor prompt={prompt} />
      </div>
    </section>
  );
}
