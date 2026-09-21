import { requireTeacher } from "@/lib/auth-server";
import CreateCatalogForm from "@/components/teacher/content/CreateCatalogForm";

export const metadata = {
  title: "Nueva presentación - Profe Kyle",
};

export default async function NewPresentationPage() {
  await requireTeacher("/teacher");
  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Nueva presentación</h1>
      <p className="mt-2 text-body-main text-text-secondary">
        Título, y un tema si quieres. Los segmentos van en el editor.
      </p>
      <div className="mt-8">
        <CreateCatalogForm kind="presentation" />
      </div>
    </section>
  );
}
