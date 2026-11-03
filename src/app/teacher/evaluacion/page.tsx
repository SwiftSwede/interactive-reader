import TeacherPageHeader from "@/components/teacher/TeacherPageHeader";
import { requireTeacher } from "@/lib/auth-server";
import { loadEvalStats, type CountRow, type EvalStats, type RankedRow } from "@/lib/evaluacion/stats";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Evaluación - Profe Kyle",
};

export default async function TeacherEvaluacionPage() {
  await requireTeacher("/teacher/evaluacion");
  const stats = await loadEvalStats(createAdminClient());

  return (
    <section>
      <TeacherPageHeader
        title="Evaluación"
        description="Histórico de la evaluación pública. Sin nombres."
      />

      {stats.started === 0 ? (
        <p className="mt-8 text-sm text-text-muted">Todavía no hay evaluaciones.</p>
      ) : (
        <Report stats={stats} />
      )}
    </section>
  );
}

function Report({ stats }: { stats: EvalStats }) {
  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric value={String(stats.started)} label="Empezaron" />
        <Metric value={String(stats.finished)} label="Terminaron" />
        <Metric value={String(stats.open)} label="Siguen abiertas" />
        <Metric
          value={stats.completionRate == null ? "—" : `${stats.completionRate}%`}
          label="Tasa de término"
        />
      </div>
      <p className="mt-3 text-sm text-text-muted">
        Redirigidos al curso de principiantes: {stats.redirected}. Esa salida no entra en la tasa.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <CountList title="Resultado" rows={stats.tracks} extra={stats.outcomes} />
        <CountList title="Cómo empezaron" rows={stats.openers} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <RankedList
          title="Preguntas"
          empty="Todavía no hay una pregunta con 5 respuestas."
          rows={stats.questions}
        />
        <RankedList
          title="Sonidos"
          empty="Todavía no hay un par con 5 respuestas."
          rows={stats.sounds}
        />
      </div>
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-paper-line bg-surface px-4 py-4">
      <p className="text-headline-lg tabular-nums text-text-primary">{value}</p>
      <p className="mt-1 text-label-sm text-text-muted">{label}</p>
    </div>
  );
}

function CountList({
  title,
  rows,
  extra,
}: {
  title: string;
  rows: CountRow[];
  extra?: CountRow[];
}) {
  const all = extra ? [...rows, ...extra] : rows;
  return (
    <div>
      <h2 className="mb-3 text-headline-md text-text-primary">{title}</h2>
      <ol className="divide-y divide-paper-line overflow-hidden rounded-card border border-paper-line">
        {all.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-3 px-3 py-2">
            <span className="min-w-0 text-text-primary">{row.label}</span>
            <span className="w-12 shrink-0 text-right text-sm tabular-nums text-text-muted">
              {row.count}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RankedList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: RankedRow[];
}) {
  return (
    <div>
      <h2 className="mb-3 text-headline-md text-text-primary">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">{empty}</p>
      ) : (
        <ol className="divide-y divide-paper-line overflow-hidden rounded-card border border-paper-line">
          <li className="flex items-baseline justify-between gap-3 px-3 py-2 text-label-sm text-text-muted">
            <span className="min-w-0">ítem</span>
            <span className="flex shrink-0 gap-4">
              <span className="w-16 text-right">respuestas</span>
              <span className="w-16 text-right">fallos</span>
            </span>
          </li>
          {rows.map((row) => (
            <li key={row.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className={`font-medium text-text-primary ${row.detail ? "" : "ipa-text"}`}>
                  {row.label}
                </span>
                {row.detail ? (
                  <span className="mt-1 block text-sm text-text-muted">{row.detail}</span>
                ) : null}
                <span className="mt-1 block text-sm text-text-muted">{row.missPercent}% fallos</span>
              </span>
              <span className="flex shrink-0 gap-4 text-sm tabular-nums text-text-muted">
                <span className="w-16 text-right">{row.answers}</span>
                <span className="w-16 text-right">{row.wrong}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
