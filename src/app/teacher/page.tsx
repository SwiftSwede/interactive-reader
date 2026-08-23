import Link from "next/link";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/dashboard/actions";
import type { CourseLevel } from "@/types";
import CreateCourseForm from "./CreateCourseForm";

export const metadata = {
  title: "Cursos - Profe Kyle",
};

type CourseRow = {
  id: string;
  name: string;
  level: CourseLevel;
  created_at: string;
};

function levelLabel(level: CourseLevel): string {
  return level === "pre-intermediate" ? "Pre-intermedio" : "Intermedio";
}

export default async function TeacherPage() {
  const teacher = await requireTeacher("/teacher");
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, name, level, created_at")
    .eq("teacher_id", teacher.id)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  const courses = (data ?? []) as CourseRow[];

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Profe Kyle</p>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
            >
              Invitaciones
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Tus cursos</h1>
        <p className="mt-2 text-sm text-gray-600">
          Un curso es el grupo. Las clases de Zoom y el link van después.
        </p>

        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Crear curso
          </h2>
          <CreateCourseForm />
        </div>

        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Cursos
          </h2>
          {courses.length === 0 ? (
            <p className="text-sm text-gray-500">
              Todavía no tienes un curso. Crea el primero.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {courses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/teacher/classes/${course.id}`}
                    className="block px-3 py-3 hover:bg-gray-50"
                  >
                    <p className="font-medium text-gray-900">{course.name}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {levelLabel(course.level)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
