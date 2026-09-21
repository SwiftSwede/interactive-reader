import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadConversationForEdit } from "@/lib/content-editor";
import ConversationEditor from "@/components/teacher/content/ConversationEditor";

export const metadata = {
  title: "Editar conversación - Profe Kyle",
};

export default async function EditConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTeacher("/teacher");
  const prompt = await loadConversationForEdit(createAdminClient(), id);
  if (!prompt) notFound();

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">{prompt.title}</h1>
      <div className="mt-8">
        <ConversationEditor prompt={prompt} />
      </div>
    </section>
  );
}
