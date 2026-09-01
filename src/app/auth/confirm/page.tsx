import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailOtpKind, resolveAuthNext } from "@/lib/auth";
import { getAppOrigin } from "@/lib/auth-server";
import ConfirmEmailButton from "./ConfirmEmailButton";

export const metadata = {
  title: "Entrar - Profe Kyle",
};

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const origin = await getAppOrigin();
  const nextPath = resolveAuthNext(params.next, origin);
  const tokenHash = params.token_hash?.trim() ?? "";
  const type = isEmailOtpKind(params.type) ? params.type : "email";

  if (!tokenHash) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Entrar a clase</h1>
        <p className="mt-2 mb-6 text-sm text-gray-600">
          Un toque más y ya estás adentro. Si este link se abrió solo, no pasa
          nada: el código de tu email también sirve en la pantalla de entrar.
        </p>
        <ConfirmEmailButton
          tokenHash={tokenHash}
          type={type}
          nextPath={nextPath}
        />
      </section>
    </main>
  );
}
