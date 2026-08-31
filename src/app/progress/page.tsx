import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import BackLink from "@/components/BackLink";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth-server";
import { loadStudentProgress } from "@/lib/progress";

export const metadata = {
  title: "Tu progreso - Profe Kyle",
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/progress");
  }

  const profile = await getProfile(user.id);
  const progress = await loadStudentProgress(
    supabase,
    user.id,
    profile?.classroomLevel ?? null
  );

  const latestDictation = progress.dictationTrend.at(-1);
  const firstDictation = progress.dictationTrend[0];
  const dictationMoved =
    latestDictation &&
    firstDictation &&
    progress.dictationTrend.length > 1 &&
    latestDictation.accuracy !== firstDictation.accuracy
      ? latestDictation.accuracy > firstDictation.accuracy
        ? "un poco mejor que al principio"
        : "todavía hay ruido. Eso está bien, es información"
      : null;

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-paper-line bg-paper-header px-4 py-3">
        <div className="mx-auto flex max-w-md items-center gap-1">
          <BackLink href="/dashboard" showLabel />
          <p className="text-label-sm text-text-muted">Profe Kyle</p>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 py-8 pb-16">
        <h1 className="text-headline-lg text-text-primary">Tu progreso</h1>
        <p className="mt-2 text-body-main text-text-secondary">
          Esto no es un diagnóstico ni un nivel oficial. Es lo que practicaste,
          y una sugerencia de qué sigue.
        </p>

        <article className="mt-6 rounded-card border border-paper-line bg-surface p-4">
          <p className="text-label-md text-text-secondary">Lectura hecha</p>
          {progress.reading.completed === 0 ? (
            <p className="mt-2 text-body-main text-text-secondary">
              Todavía no terminas un cuento. Empieza por el de abajo, o por el
              que te mandé en Zoom.
            </p>
          ) : (
            <>
              <p className="mt-2 text-headline-md text-text-primary">
                {progress.reading.completed === 1
                  ? "1 cuento"
                  : `${progress.reading.completed} cuentos`}
              </p>
              {progress.reading.inProgress > 0 ? (
                <p className="mt-1 text-label-sm text-text-muted">
                  {progress.reading.inProgress === 1
                    ? "1 más a medias"
                    : `${progress.reading.inProgress} más a medias`}
                </p>
              ) : null}
            </>
          )}
        </article>

        <section className="mt-8">
          <h2 className="text-headline-md text-text-primary">
            Práctica reciente
          </h2>
          <p className="mt-3 text-body-main text-text-secondary">
            {progress.dictationTrend.length === 0
              ? "Dictado: todavía no hay intentos."
              : `Dictado: ${progress.dictationTrend.length} ${
                  progress.dictationTrend.length === 1 ? "intento" : "intentos"
                }${
                  latestDictation
                    ? `, el último alrededor de ${formatPercent(latestDictation.accuracy)}`
                    : ""
                }.`}{" "}
            {progress.pronunciationHistory.length === 0
              ? "Pronunciación: todavía no grabaste."
              : `Pronunciación: ${progress.pronunciationHistory.length} ${
                  progress.pronunciationHistory.length === 1
                    ? "sesión"
                    : "sesiones"
                }.`}{" "}
            Palabras que tocaste: {progress.wordsLookedUp}.
          </p>
          {dictationMoved ? (
            <p className="mt-2 text-label-sm text-text-muted">
              Del primero al último dictado, {dictationMoved}.
            </p>
          ) : null}
          {progress.wordsLookedUp === 0 &&
          progress.dictationTrend.length === 0 &&
          progress.pronunciationHistory.length === 0 ? (
            <p className="mt-2 text-label-sm text-text-muted">
              Cuando toques palabras, dictes o grabes, eso aparece aquí. Nada
              de eso interrumpe la lectura.
            </p>
          ) : null}
        </section>

        {progress.strugglingTopics.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-headline-md text-text-primary">
              Dónde vale repetir
            </h2>
            <ul className="mt-3 space-y-2">
              {progress.strugglingTopics.map((topic) => (
                <li
                  key={topic.name}
                  className="rounded-card border border-paper-line bg-surface px-3 py-3 text-label-md text-text-primary"
                >
                  {topic.displayName}
                  <span className="mt-1 block text-label-sm font-normal text-text-muted">
                    Esto salió en la práctica. No es un fallo tuyo, es un
                    sonido o una estructura que pide otra pasada.
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="text-headline-md text-text-primary">
            Siguiente actividad
          </h2>
          {progress.suggested ? (
            <Link
              href={progress.suggested.href}
              className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-card border border-paper-line bg-surface px-3 py-3 hover:bg-surface-hover active:bg-accent-soft"
            >
              <span>
                <span className="block text-headline-md text-text-primary">
                  {progress.suggested.title}
                </span>
                <span className="mt-1 block text-label-sm text-text-muted">
                  Una sugerencia, no una receta. Si no te late, elige otro
                  cuento.
                </span>
              </span>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-text-muted"
                aria-hidden="true"
              />
            </Link>
          ) : (
            <p className="mt-3 text-body-main text-text-secondary">
              Aún no tengo una sugerencia. Lee un cuento y vuelve. Si ya
              terminaste los que hay, avísame y cargo más.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
