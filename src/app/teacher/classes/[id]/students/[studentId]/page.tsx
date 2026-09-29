import Link from "next/link";
import { notFound } from "next/navigation";
import LocalDateTime from "@/components/LocalDateTime";
import ObservationTagForm from "@/components/teacher/ObservationTagForm";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getOwnedCourse,
  loadCourseSessions,
  loadSessionStudentStatus,
  loadStudentLookups,
  loadWritingSubmissions,
  sessionTitle,
} from "@/lib/teacher";
import { loadFicha, type Ficha } from "@/lib/ficha";
import {
  loadObservationVocabulary,
  loadOpenFlags,
} from "@/lib/topic-evidence";

export const metadata = {
  title: "Estudiante - Profe Kyle",
};

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; studentId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { id, studentId } = await params;
  const { session: focusSessionId } = await searchParams;
  const { course, supabase } = await getOwnedCourse(id);
  const sessions = await loadCourseSessions(supabase, course.id);

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("student_id, display_name")
    .eq("course_id", course.id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!enrollment) {
    notFound();
  }

  const displayName = enrollment.display_name.trim() || "Sin nombre";
  const admin = createAdminClient();
  const vocabularyP = loadObservationVocabulary(admin);
  const flagsP = loadOpenFlags(admin, [studentId]);
  const fichaP = loadFicha(admin, studentId);

  const perSession = await Promise.all(
    sessions.map(async (session) => {
      const [students, lookups, submissions] = await Promise.all([
        loadSessionStudentStatus(
          supabase,
          course.id,
          session.id,
          session.storyId
        ),
        session.sessionType === "story" ||
        session.sessionType === "dialogue" ||
        session.sessionType === "movie_talk" ||
        session.sessionType === "song"
          ? loadStudentLookups(supabase, session.id, studentId)
          : Promise.resolve([]),
        session.sessionType === "writing"
          ? loadWritingSubmissions(supabase, session.id)
          : Promise.resolve([]),
      ]);
      const status = students.find((row) => row.studentId === studentId);
      const writing = submissions.find((row) => row.userId === studentId);
      return { session, status, lookups, writing };
    })
  );

  const focusedFirst = [...perSession].sort((a, b) => {
    if (focusSessionId) {
      if (a.session.id === focusSessionId) return -1;
      if (b.session.id === focusSessionId) return 1;
    }
    return 0;
  });

  const [vocabulary, openFlags, ficha] = await Promise.all([
    vocabularyP,
    flagsP,
    fichaP,
  ]);

  return (
    <section>
      <p className="text-sm text-text-muted">
        <Link
          href={`/teacher/classes/${course.id}`}
          className="underline-offset-2 hover:text-text-primary hover:underline"
        >
          {course.name}
        </Link>
      </p>
      <h1 className="mt-2 text-headline-lg text-text-primary">{displayName}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Lo que hizo en cada clase. Sin juicios, solo lo que se ve.
      </p>

      <div className="mt-6">
        <h2 className="text-headline-md text-text-primary">Observación</h2>
        <ObservationTagForm
          studentId={studentId}
          layout="families"
          vocabulary={vocabulary}
          existingFlags={openFlags.map((flag) => ({
            tagType: flag.tagType,
            tagName: flag.tagName,
            displayName: flag.displayName,
          }))}
        />
      </div>

      <FichaSection ficha={ficha} />

      {focusedFirst.length === 0 ? (
        <p className="mt-8 text-sm text-text-muted">
          Todavía no hay clases en este curso.
        </p>
      ) : (
        <ul className="mt-8 space-y-6">
          {focusedFirst.map(({ session, status, lookups, writing }) => {
            const focused = session.id === focusSessionId;
            const isWriting = session.sessionType === "writing";
            return (
              <li
                key={session.id}
                id={`session-${session.id}`}
                className={`rounded-card border px-3 py-3 ${
                  focused ? "border-accent-soft bg-accent-softer" : "border-paper-line"
                }`}
              >
                <Link
                  href={`/teacher/classes/${course.id}/sessions/${session.id}`}
                  className="font-medium text-text-primary hover:underline"
                >
                  {sessionTitle(session)}
                </Link>
                <LocalDateTime iso={session.start} />
                <p className="mt-2 text-sm text-text-secondary">
                  {status?.opened
                    ? status.attended
                      ? `Abrió ${isWriting ? "la escritura" : "la historia"}. Llegó a tiempo.`
                      : `Abrió ${isWriting ? "la escritura" : "la historia"}. Fuera de la ventana de clase.`
                    : `Todavía no abre ${isWriting ? "esta escritura" : "esta historia"}.`}
                </p>
                {status?.openedAt && (
                  <LocalDateTime iso={status.openedAt} />
                )}

                {isWriting ? (
                  <>
                    <h3 className="mt-4 text-sm font-semibold text-text-primary">
                      Escritura
                    </h3>
                    {!writing || !writing.submissionText.trim() ? (
                      <p className="mt-1 text-sm text-text-muted">
                        Todavía no escribió.
                      </p>
                    ) : (
                      <div className="mt-2">
                        <p className="whitespace-pre-wrap text-sm text-text-primary">
                          {writing.submissionText}
                        </p>
                        <p className="mt-2 text-xs text-text-muted">
                          {writing.wordCount} palabras
                          {writing.wpm ? ` · ${writing.wpm} ppm` : ""}
                          {writing.status === "corrected"
                            ? " · Corregido"
                            : writing.status === "submitted"
                              ? " · Entregado"
                              : " · Borrador"}
                        </p>
                        {writing.id && (
                          <Link
                            href={`/teacher/classes/${course.id}/sessions/${session.id}/submissions/${writing.id}`}
                            className="mt-2 inline-block text-sm text-text-accent underline-offset-2 hover:underline"
                          >
                            Corregir
                          </Link>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="mt-4 text-sm font-semibold text-text-primary">
                      Comprensión
                    </h3>
                    {!status || status.answers.length === 0 ? (
                      <p className="mt-1 text-sm text-text-muted">
                        Todavía no escribió respuestas.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {status.answers.map((answer) => (
                          <li key={answer.questionId}>
                            <p className="text-xs font-medium text-text-muted">
                              {answer.position}. {answer.question}
                            </p>
                            <p className="mt-0.5 text-sm text-text-primary">
                              {answer.responseText.trim() || "(vacío)"}
                            </p>
                            <LocalDateTime iso={answer.submittedAt} />
                          </li>
                        ))}
                      </ul>
                    )}

                    <h3 className="mt-4 text-sm font-semibold text-text-primary">
                      Palabras que tocó
                    </h3>
                    {lookups.length === 0 ? (
                      <p className="mt-1 text-sm text-text-muted">
                        No tocó ninguna palabra, o todavía no lo estamos
                        guardando.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {lookups.map((lookup) => (
                          <li
                            key={`${lookup.text}-${lookup.lookedUpAt}`}
                            className="flex flex-wrap items-baseline gap-2"
                          >
                            <span className="rounded-small bg-surface-hover px-2.5 py-1 text-sm text-text-primary">
                              {lookup.text}
                            </span>
                            <LocalDateTime iso={lookup.lookedUpAt} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FichaSection({ ficha }: { ficha: Ficha }) {
  return (
    <div className="mt-6">
      <h2 className="text-headline-md text-text-primary">Ficha</h2>

      <h3 className="mt-4 text-sm font-semibold text-text-primary">
        Banderas activas
      </h3>
      {ficha.flags.length === 0 ? (
        <p className="mt-1 text-sm text-text-muted">Sin banderas activas.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {ficha.flags.map((flag) => (
            <li
              key={`${flag.tagType}-${flag.displayName}-${flag.updatedAt}`}
              className="flex flex-wrap items-baseline gap-2"
            >
              <span className="rounded-small bg-surface-hover px-2.5 py-1 text-sm text-text-primary">
                {flag.displayName}
              </span>
              <span className="text-xs text-text-muted">
                {flag.familyLabel} · {flag.sourceLabel}
              </span>
              <LocalDateTime iso={flag.updatedAt} />
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-semibold text-text-primary">
        Errores frecuentes
      </h3>
      {ficha.errorEvents.length === 0 ? (
        <p className="mt-1 text-sm text-text-muted">
          Todavía no hay errores guardados.
        </p>
      ) : (
        <ul className="mt-2 space-y-3">
          {ficha.errorEvents.map((event, index) => (
            <li key={`${event.occurredAt}-${index}`}>
              {event.tagDisplayNames.length > 0 && (
                <p className="text-xs font-medium text-text-muted">
                  {event.tagDisplayNames.join(", ")}
                </p>
              )}
              <p className="mt-0.5 text-sm">
                <span className="text-text-secondary">{event.answer}</span>
                {" → "}
                <span className="font-medium text-text-primary">
                  {event.corrected}
                </span>
              </p>
              <LocalDateTime iso={event.occurredAt} />
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-semibold text-text-primary">
        Palabras que no entendió
      </h3>
      {ficha.flaggedWords.length === 0 ? (
        <p className="mt-1 text-sm text-text-muted">
          Todavía no hay palabras que no entendió.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {ficha.flaggedWords.map((word) => (
            <li
              key={word.flagText}
              className="flex flex-wrap items-baseline gap-2"
            >
              <span className="rounded-small bg-surface-hover px-2.5 py-1 text-sm text-text-primary">
                {word.flagText}
              </span>
              <span className="text-xs text-text-muted">
                {word.timesRequested}{" "}
                {word.timesRequested === 1 ? "vez" : "veces"}
              </span>
              <LocalDateTime iso={word.lastRequestedAt} />
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-semibold text-text-primary">
        Sonidos débiles
      </h3>
      {ficha.weakSounds.length === 0 ? (
        <p className="mt-1 text-sm text-text-muted">
          Todavía no hay sonidos débiles.
        </p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {ficha.weakSounds.map((sound) => (
            <li
              key={sound.ipa}
              className="rounded-small bg-surface-hover px-2.5 py-1"
            >
              <span className="ipa-text text-sm text-text-primary">
                {sound.ipa}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-semibold text-text-primary">
        Tus observaciones
      </h3>
      {ficha.observations.length === 0 ? (
        <p className="mt-1 text-sm text-text-muted">
          Todavía no hay observaciones.
        </p>
      ) : (
        <ul className="mt-2 space-y-3">
          {ficha.observations.map((event, index) => (
            <li key={`${event.occurredAt}-${index}`}>
              {(event.flags.length > 0 || event.clears.length > 0) && (
                <ul className="flex flex-wrap gap-2">
                  {event.flags.map((name, flagIndex) => (
                    <li
                      key={`flag-${flagIndex}-${name}`}
                      className="rounded-small bg-surface-hover px-2.5 py-1 text-sm text-text-primary"
                    >
                      {name}
                    </li>
                  ))}
                  {event.clears.map((name, clearIndex) => (
                    <li
                      key={`clear-${clearIndex}-${name}`}
                      className="rounded-small bg-surface-hover px-2.5 py-1 text-sm text-text-secondary"
                    >
                      {name} · quitada
                    </li>
                  ))}
                </ul>
              )}
              {event.note.trim() ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
                  {event.note}
                </p>
              ) : null}
              <LocalDateTime iso={event.occurredAt} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
