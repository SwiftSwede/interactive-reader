import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getClassroomStudents,
  getProfile,
  promoteTeacherIfNeeded,
} from "@/lib/auth-server";
import BackLink from "@/components/BackLink";
import { signOut } from "./actions";
import InviteStudentForm from "./InviteStudentForm";

export const metadata = {
  title: "Tu sesión - Profe Kyle",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  await promoteTeacherIfNeeded(user.id, user.email);
  const profile = await getProfile(user.id);
  const isTeacher = profile?.role === "teacher";

  const classroomStudents = isTeacher ? await getClassroomStudents() : [];

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1">
            {isTeacher ? <BackLink href="/teacher" /> : null}
            <p className="text-sm text-gray-500">Profe Kyle</p>
          </div>
          <div className="flex items-center gap-4">
            {isTeacher && (
              <Link
                href="/teacher"
                className="text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
              >
                Cursos
              </Link>
            )}
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
        {isTeacher ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              Estás como profe
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Aquí invitas a tus estudiantes de clase. Sin Stripe todavía: tú
              los das de alta. Los cursos y el link de Zoom vienen después.
            </p>
            <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-800">
              {user.email}
            </p>

            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Invitar estudiante
              </h2>
              <InviteStudentForm />
            </div>

            <div className="mt-10">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Estudiantes de clase
              </h2>
              <p className="mb-3 text-sm text-gray-600">
                Solo quienes siguen pagando. Si pausaron en ThriveCart, no salen
                aquí. Para PayPal o becas, invítalos abajo.
              </p>
              {classroomStudents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Todavía no hay nadie. Invita al primero.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {classroomStudents.map((student) => (
                    <li
                      key={student.id}
                      className="px-3 py-3 text-sm text-gray-800"
                    >
                      <p className="font-medium">
                        {student.displayName ?? "Sin nombre"}
                      </p>
                      <p className="mt-0.5 text-gray-500">{student.email}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              Ya estás adentro
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Sin contraseña, como prometí. Este es tu email:
            </p>
            <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-800">
              {user.email}
            </p>
            <p className="mt-6 text-sm text-gray-500">
              Pronto vas a entrar a las historias de clase desde el link que
              pego en el chat de Zoom. Por ahora, esto confirma que tu sesión
              funciona.
            </p>
            <p className="mt-6">
              <Link
                href="/progress"
                className="text-sm text-gray-800 underline-offset-2 hover:underline"
              >
                Tu progreso
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
