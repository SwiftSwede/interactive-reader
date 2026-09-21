import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadExamPromptForEdit } from "@/lib/content-editor";
import ExamEditor from "@/components/teacher/content/ExamEditor";

export const metadata = {
  title: "Editar examen - Profe Kyle",
};

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTeacher("/teacher");
  const exam = await loadExamPromptForEdit(createAdminClient(), id);
  if (!exam) notFound();

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">{exam.title}</h1>
      <div className="mt-8">
        <ExamEditor exam={exam} />
      </div>
    </section>
  );
}
