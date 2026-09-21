import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadWritingPromptForEdit } from "@/lib/content-editor";
import WritingEditor from "@/components/teacher/content/WritingEditor";

export const metadata = {
  title: "Editar escritura - Profe Kyle",
};

export default async function EditWritingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTeacher("/teacher");
  const prompt = await loadWritingPromptForEdit(createAdminClient(), id);
  if (!prompt) notFound();

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">{prompt.title}</h1>
      <div className="mt-8">
        <WritingEditor prompt={prompt} />
      </div>
    </section>
  );
}
