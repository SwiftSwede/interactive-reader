import { requireTeacher } from "@/lib/auth-server";
import { TeacherTitle } from "@/components/teacher/TeacherHeading";
import CreateCatalogForm from "@/components/teacher/content/CreateCatalogForm";

export const metadata = {
  title: "Nueva conversación - Profe Kyle",
};

export default async function NewConversationPage() {
  await requireTeacher("/teacher");
  return (
    <section>
      <TeacherTitle>Nueva conversación</TeacherTitle>
      <p className="mt-2 text-body-main text-text-secondary">
        Título y nivel. Las preguntas las agregas en el editor.
      </p>
      <div className="mt-8">
        <CreateCatalogForm kind="conversation" />
      </div>
    </section>
  );
}
