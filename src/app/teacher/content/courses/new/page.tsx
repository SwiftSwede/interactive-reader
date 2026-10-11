import { requireTeacher } from "@/lib/auth-server";
import SelfPacedCourseForm from "@/components/teacher/SelfPacedCourseForm";

export const metadata = {
  title: "Nuevo curso autoguiado - Profe Kyle",
};

export default async function NewSelfPacedCoursePage() {
  await requireTeacher("/teacher/content/courses/new");
  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">
        Nuevo curso autoguiado
      </h1>
      <p className="mt-2 text-body-main text-text-secondary">
        Nombre, nivel y una descripción. Las lecciones las agregas después.
      </p>
      <div className="mt-8">
        <SelfPacedCourseForm />
      </div>
    </section>
  );
}
