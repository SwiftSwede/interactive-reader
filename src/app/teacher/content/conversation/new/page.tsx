import { requireTeacher } from "@/lib/auth-server";
import CreateCatalogForm from "@/components/teacher/content/CreateCatalogForm";

export const metadata = {
  title: "Nueva conversación - Profe Kyle",
};

export default async function NewConversationPage() {
  await requireTeacher("/teacher");
  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Nueva conversación</h1>
      <p className="mt-2 text-body-main text-text-secondary">
        Título y nivel. Las preguntas las agregas en el editor.
      </p>
      <div className="mt-8">
        <CreateCatalogForm kind="conversation" />
      </div>
    </section>
  );
}
