import { requireTeacher } from "@/lib/auth-server";
import CreateCatalogForm from "@/components/teacher/content/CreateCatalogForm";

export const metadata = {
  title: "Nueva escritura - Profe Kyle",
};

export default async function NewWritingPage() {
  await requireTeacher("/teacher");
  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Nueva escritura</h1>
      <p className="mt-2 text-body-main text-text-secondary">
        Título y nivel. El resto lo llenas en el editor.
      </p>
      <div className="mt-8">
        <CreateCatalogForm kind="writing" />
      </div>
    </section>
  );
}
