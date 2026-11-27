import { requireTeacher } from "@/lib/auth-server";
import { TeacherTitle } from "@/components/teacher/TeacherHeading";
import CreateCatalogForm from "@/components/teacher/content/CreateCatalogForm";

export const metadata = {
  title: "Nueva presentación - Profe Kyle",
};

export default async function NewPresentationPage() {
  await requireTeacher("/teacher");
  return (
    <section>
      <TeacherTitle>Nueva presentación</TeacherTitle>
      <p className="mt-2 text-body-main text-text-secondary">
        Título, y un tema si quieres. Los segmentos van en el editor.
      </p>
      <div className="mt-8">
        <CreateCatalogForm kind="presentation" />
      </div>
    </section>
  );
}
