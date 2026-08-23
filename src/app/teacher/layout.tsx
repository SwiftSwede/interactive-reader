import Link from "next/link";
import { signOut } from "@/app/dashboard/actions";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link href="/teacher" className="text-sm text-gray-500">
            Profe Kyle
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/teacher"
              className="text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
            >
              Cursos
            </Link>
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
      {children}
    </div>
  );
}
