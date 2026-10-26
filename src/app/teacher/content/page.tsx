import { requireTeacher } from "@/lib/auth-server";
import { isCatalogAdminEmail } from "@/lib/catalog-crud";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllContent } from "@/lib/content-editor";
import TeacherPageHeader from "@/components/teacher/TeacherPageHeader";
import ContentIndex from "./ContentIndex";

export const metadata = {
  title: "Contenido - Profe Kyle",
};

export default async function TeacherContentPage() {
  const teacher = await requireTeacher("/teacher");
  const items = await listAllContent(createAdminClient());

  return (
    <section>
      <TeacherPageHeader
        title="Contenido"
        description="Typos, preguntas y clips. Las escrituras, exámenes, presentaciones y conversaciones también se crean aquí."
      />
      <div className="mt-8">
        <ContentIndex
          items={items}
          canDelete={isCatalogAdminEmail(teacher.email)}
        />
      </div>
    </section>
  );
}
