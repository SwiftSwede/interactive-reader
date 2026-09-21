import { requireTeacher } from "@/lib/auth-server";
import CreateCatalogForm from "@/components/teacher/content/CreateCatalogForm";

export const metadata = {
  title: "Nuevo examen - Profe Kyle",
};

export default async function NewExamPage() {
  await requireTeacher("/teacher");
  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Nuevo examen</h1>
      <p className="mt-2 text-body-main text-text-secondary">
        Título y nivel. Las tareas las pegas en el editor.
      </p>
      <div className="mt-8">
        <CreateCatalogForm kind="exam" />
      </div>
    </section>
  );
}
