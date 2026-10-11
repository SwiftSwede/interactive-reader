import Link from "next/link";
import { requireTeacher } from "@/lib/auth-server";
import { courseLevelLabel } from "@/lib/teacher/groups-students";
import { listSelfPacedCourses } from "@/lib/self-paced-admin";

export const metadata = {
  title: "Cursos autoguiados - Profe Kyle",
};

export default async function SelfPacedCourseListPage() {
  const teacher = await requireTeacher("/teacher/content/courses");
  const courses = await listSelfPacedCourses(teacher.id);

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Cursos autoguiados</h1>
      <p className="mt-2 text-body-main text-text-secondary">
        Sin Zoom y sin clases en vivo. Ordenas las lecciones aquí.
      </p>
      <Link
        href="/teacher/content/courses/new"
        className="mt-6 inline-flex min-h-11 items-center rounded-card border border-paper-line bg-surface px-4 text-label-md text-text-primary hover:bg-surface-hover"
      >
        Nuevo curso autoguiado
      </Link>
      {courses.length === 0 ? (
        <p className="mt-8 text-body-main text-text-secondary">
          Todavía no hay cursos autoguiados.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/teacher/content/courses/${course.id}`}
                className="block rounded-card border border-paper-line bg-surface px-4 py-3 hover:bg-surface-hover"
              >
                <p className="text-label-md text-text-primary">{course.name}</p>
                <p className="mt-1 text-label-sm text-text-secondary">
                  {courseLevelLabel(course.level)}. {course.lessonCount}{" "}
                  lecciones. {course.isPublished ? "Publicado" : "Borrador"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
