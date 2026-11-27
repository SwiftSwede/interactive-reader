import { requireTeacher } from "@/lib/auth-server";
import { TeacherTitle } from "@/components/teacher/TeacherHeading";
import SelfPacedCourseForm from "@/components/teacher/SelfPacedCourseForm";

export const metadata = {
  title: "Nuevo curso autoguiado - Profe Kyle",
};

export default async function NewSelfPacedCoursePage() {
  await requireTeacher("/teacher/content/courses/new");
  return (
    <section>
      <TeacherTitle>Nuevo curso autoguiado</TeacherTitle>
      <p className="mt-2 text-body-main text-text-secondary">
        Nombre, nivel y una descripción. Las lecciones las agregas después.
      </p>
      <div className="mt-8">
        <SelfPacedCourseForm />
      </div>
    </section>
  );
}
