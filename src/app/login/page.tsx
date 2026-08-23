import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Entrar - Profe Kyle",
  description: "Entra con tu email. Te mando un link, sin contraseña.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="mx-auto max-w-md">
          <p className="text-sm text-gray-500">Profe Kyle</p>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Entra con tu email</h1>
        <p className="mt-2 mb-6 text-sm text-gray-600">
          Te mando un link. Sin contraseña. Haz clic y ya estás adentro.
        </p>

        {params.error && (
          <p className="mb-4 text-sm text-red-600">
            Ese link ya no sirve o expiró. Pide uno nuevo.
          </p>
        )}

        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
