import { requireTeacher } from "@/lib/auth-server";
import { TeacherTitle } from "@/components/teacher/TeacherHeading";
import CreateCatalogForm from "@/components/teacher/content/CreateCatalogForm";

export const metadata = {
  title: "Nuevo examen - Profe Kyle",
};

export default async function NewExamPage() {
  await requireTeacher("/teacher");
  return (
    <section>
      <TeacherTitle>Nuevo examen</TeacherTitle>
      <p className="mt-2 text-body-main text-text-secondary">
        Título y nivel. Las tareas las pegas en el editor.
      </p>
      <div className="mt-8">
        <CreateCatalogForm kind="exam" />
      </div>
    </section>
  );
}
