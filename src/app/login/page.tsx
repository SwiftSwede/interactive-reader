import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Entrar - Profe Kyle",
  description: "Entra con tu email. Te mando un código, sin contraseña.",
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
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 h-14 border-b border-paper-line bg-paper-header backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-2xl items-center px-4">
          <p className="text-label-sm text-text-secondary">Profe Kyle</p>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 pt-6 pb-16">
        <h1 className="text-headline-lg text-text-primary">Entra con tu email</h1>
        <p className="mt-2 mb-6 text-body-main text-text-secondary">
          Te mando un código de 8 números. Lo escribes aquí y ya estás adentro.
          Sin contraseña. No hace falta cambiar de navegador.
        </p>

        {params.error && (
          <p className="mb-4 rounded-card bg-error-bg px-3 py-3 text-label-md text-error">
            Ese link ya no sirve. Pide un código nuevo y escríbelo en esta
            pantalla. Si Gmail abre otro navegador, ignora el link y usa el
            código.
          </p>
        )}

        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
