import { requireTeacher } from "@/lib/auth-server";
import { TeacherTitle } from "@/components/teacher/TeacherHeading";
import CreateCatalogForm from "@/components/teacher/content/CreateCatalogForm";

export const metadata = {
  title: "Nueva escritura - Profe Kyle",
};

export default async function NewWritingPage() {
  await requireTeacher("/teacher");
  return (
    <section>
      <TeacherTitle>Nueva escritura</TeacherTitle>
      <p className="mt-2 text-body-main text-text-secondary">
        Título y nivel. El resto lo llenas en el editor.
      </p>
      <div className="mt-8">
        <CreateCatalogForm kind="writing" />
      </div>
    </section>
  );
}
