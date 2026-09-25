import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listExamPromptSessions,
  loadExamPromptForEdit,
} from "@/lib/content-editor";
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
  const admin = createAdminClient();
  const [exam, sessions] = await Promise.all([
    loadExamPromptForEdit(admin, id),
    listExamPromptSessions(admin, id),
  ]);
  if (!exam) notFound();

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">{exam.title}</h1>
      <div className="mt-8">
        <ExamEditor exam={exam} sessions={sessions} />
      </div>
    </section>
  );
}
