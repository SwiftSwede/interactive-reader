import { getClassroomStudents, requireTeacher } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import InviteStudentForm from "@/app/dashboard/InviteStudentForm";
import StudentRoster from "@/components/teacher/StudentRoster";
import {
  currentYearMonth,
  mapStudentsToCurrentGroup,
} from "@/lib/teacher";

export const metadata = {
  title: "Estudiantes - Profe Kyle",
};

export default async function TeacherStudentsPage() {
  await requireTeacher("/teacher");
  const supabase = await createClient();
  const classroomStudents = await getClassroomStudents();
  const groupByStudent = await mapStudentsToCurrentGroup(
    supabase,
    classroomStudents.map((student) => student.id),
    currentYearMonth()
  );

  const students = classroomStudents.map((student) => {
    const group = groupByStudent.get(student.id);
    return {
      id: student.id,
      email: student.email,
      displayName: student.displayName,
      groupName: group?.groupName ?? null,
      courseId: group?.courseId ?? null,
    };
  });

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Estudiantes</h1>
      <p className="mt-2 text-body-main text-text-secondary">
        Quienes siguen en clase. Si pausaron en ThriveCart, no salen aquí.
      </p>

      <div className="mt-8">
        <h2 className="mb-3 text-headline-md text-text-primary">
          Invitar estudiante
        </h2>
        <p className="mb-4 text-body-main text-text-secondary">
          Aquí invitas a tus estudiantes de clase. Sin Stripe todavía: tú los
          das de alta. Los cursos y el link de Zoom vienen después.
        </p>
        <p className="mb-4 text-label-sm text-text-muted">
          Quitar es para esos invitados. Si pagan en Stripe, páusalos en
          ThriveCart.
        </p>
        <InviteStudentForm />
      </div>

      <div className="mt-10">
        <StudentRoster students={students} />
      </div>
    </section>
  );
}
