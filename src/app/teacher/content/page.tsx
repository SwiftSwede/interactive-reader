import { requireTeacher } from "@/lib/auth-server";
import { isCatalogAdminEmail } from "@/lib/catalog-crud";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllContent } from "@/lib/content-editor";
import ContentIndex from "./ContentIndex";

export const metadata = {
  title: "Contenido - Profe Kyle",
};

export default async function TeacherContentPage() {
  const teacher = await requireTeacher("/teacher");
  const items = await listAllContent(createAdminClient());

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Contenido</h1>
      <p className="mt-2 text-body-main text-text-secondary">
        Aquí arreglas typos, preguntas y clips, y creas escrituras, exámenes,
        presentaciones y conversaciones.
      </p>
      <div className="mt-8">
        <ContentIndex
          items={items}
          canDelete={isCatalogAdminEmail(teacher.email)}
        />
      </div>
    </section>
  );
}
