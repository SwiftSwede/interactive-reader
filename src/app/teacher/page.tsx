import Link from "next/link";
import { requireTeacher, getClassroomStudents } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import type { CourseLevel } from "@/types";
import CreateCourseForm from "./CreateCourseForm";
import LocalDateTime from "@/components/LocalDateTime";
import InviteStudentForm from "@/app/dashboard/InviteStudentForm";
import RemoveStudentButton from "@/components/RemoveStudentButton";
import {
  countActiveStudentsByCourse,
  courseLevelLabel,
  currentSessionKindLabel,
  loadSessionsForCourses,
  pickCurrentSession,
  sessionTitle,
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

  const [studentCountByCourse, sessions, classroomStudents] = await Promise.all([
    countActiveStudentsByCourse(supabase, courseIds),
    loadSessionsForCourses(supabase, courseIds),
    getClassroomStudents(),
  ]);

  const sessionsByCourse = new Map<string, TeacherSession[]>();
  for (const session of sessions) {
    const list = sessionsByCourse.get(session.courseId) ?? [];
    list.push(session);
    sessionsByCourse.set(session.courseId, list);
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
                          {sessionTitle(current.session)}
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

      <div id="invitaciones" className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Invitar estudiante
        </h2>
        <p className="mb-3 text-sm text-gray-600">
          Aquí invitas a tus estudiantes de clase. Sin Stripe todavía: tú los
          das de alta. Los cursos y el link de Zoom vienen después.
        </p>
        <InviteStudentForm />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Estudiantes de clase
        </h2>
        <p className="mb-3 text-sm text-gray-600">
          Solo quienes siguen pagando. Si pausaron en ThriveCart, no salen
          aquí. Para PayPal o becas, invítalos abajo. Quitar es para esos
          invitados. Si pagan en Stripe, páusalos en ThriveCart.
        </p>
        {classroomStudents.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no hay nadie. Invita al primero.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {classroomStudents.map((student) => (
              <li key={student.id} className="px-3 py-3 text-sm text-gray-800">
                <p className="font-medium">
                  {student.displayName ?? "Sin nombre"}
                </p>
                <p className="mt-0.5 text-gray-500">{student.email}</p>
                <RemoveStudentButton studentId={student.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
