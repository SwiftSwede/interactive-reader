import Link from "next/link";
import { requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { CourseLevel } from "@/types";
import CreateCourseForm from "./CreateCourseForm";
import LocalDateTime from "@/components/LocalDateTime";
import {
  courseLevelLabel,
  currentSessionKindLabel,
  mapSessionRow,
  pickCurrentSession,
  studentCountLabel,
  type TeacherSession,
} from "@/lib/teacher";

export const metadata = {
  title: "Cursos - Profe Kyle",
};

type CourseRow = {
  id: string;
  name: string;
  level: CourseLevel;
  created_at: string;
};

type SessionListRow = {
  id: string;
  course_id: string;
  story_id: string;
  session_start_time: string;
  session_end_time: string;
  answers_revealed: boolean;
  notes: string | null;
  session_link_token: string;
  stories:
    | { title: string; slug: string }
    | { title: string; slug: string }[]
    | null;
};

type EnrollmentCountRow = {
  course_id: string;
};

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
  const courseIds = courses.map((course) => course.id);

  const [{ data: enrollmentRows }, { data: sessionRows }] = await Promise.all([
    courseIds.length > 0
      ? supabase
          .from("course_enrollments")
          .select("course_id")
          .in("course_id", courseIds)
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase
          .from("course_sessions")
          .select(
            "id, course_id, story_id, session_start_time, session_end_time, answers_revealed, notes, session_link_token, stories ( title, slug )"
          )
          .in("course_id", courseIds)
      : Promise.resolve({ data: [] }),
  ]);

  const studentCountByCourse = new Map<string, number>();
  for (const row of (enrollmentRows ?? []) as EnrollmentCountRow[]) {
    studentCountByCourse.set(
      row.course_id,
      (studentCountByCourse.get(row.course_id) ?? 0) + 1
    );
  }

  const sessionsByCourse = new Map<string, TeacherSession[]>();
  for (const row of (sessionRows ?? []) as SessionListRow[]) {
    const mapped = mapSessionRow(row);
    const list = sessionsByCourse.get(mapped.courseId) ?? [];
    list.push(mapped);
    sessionsByCourse.set(mapped.courseId, list);
  }

  return (
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
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Cursos</h2>
        {courses.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no tienes un curso. Crea el primero.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {courses.map((course) => {
              const count = studentCountByCourse.get(course.id) ?? 0;
              const current = pickCurrentSession(
                sessionsByCourse.get(course.id) ?? []
              );
              return (
                <li key={course.id}>
                  <Link
                    href={`/teacher/classes/${course.id}`}
                    className="block px-3 py-3 hover:bg-gray-50"
                  >
                    <p className="font-medium text-gray-900">{course.name}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {courseLevelLabel(course.level)} ·{" "}
                      {studentCountLabel(count)}
                    </p>
                    {current ? (
                      <div className="mt-1 text-sm text-gray-600">
                        <p>
                          {currentSessionKindLabel(current.kind)}:{" "}
                          {current.session.story?.title ?? "Historia"}
                        </p>
                        <LocalDateTime iso={current.session.start} />
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-400">
                        Todavía no hay clase.
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
