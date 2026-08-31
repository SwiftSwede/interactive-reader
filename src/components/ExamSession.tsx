"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackLink from "@/components/BackLink";
import { createClient } from "@/lib/supabase/client";
import { flattenFillSlots, formatCountdown, remainingMs } from "@/lib/exam";
import { saveExamAnswers, submitExamAnswers } from "@/app/exam/actions";
import type {
  ExamTask2CorrectionAnswer,
  ExamTask2LetterAnswer,
  GroupExamPrompt,
} from "@/types";

type Task1Answer = { slotIndex: number; answer: string };
type Task3Answer = { sentenceNumber: number; englishTranslation: string };

export default function ExamSession({
  sessionId,
  prompt,
  group,
  isWriter,
  isTeacher,
  allowReveal,
  initialTask1,
  initialTask2,
  initialTask3,
  initialStatus,
  startedAt,
  reviewRevealedAt,
}: {
  sessionId: string;
  prompt: GroupExamPrompt;
  group: { id: string; label: string } | null;
  isWriter: boolean;
  isTeacher: boolean;
  allowReveal: boolean;
  initialTask1: Task1Answer[];
  initialTask2: ExamTask2LetterAnswer[] | ExamTask2CorrectionAnswer[];
  initialTask3: Task3Answer[];
  initialStatus: "in_progress" | "submitted" | null;
  startedAt: string | null;
  reviewRevealedAt: string | null;
}) {
  const [task, setTask] = useState(1);
  const [task1, setTask1] = useState<Task1Answer[]>(initialTask1);
  const [task2, setTask2] = useState(initialTask2);
  const [task3, setTask3] = useState<Task3Answer[]>(initialTask3);
  const [status, setStatus] = useState(initialStatus);
  const [vocabOpen, setVocabOpen] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const start = startedAt ?? new Date().toISOString();
  const showKeys = allowReveal || Boolean(reviewRevealedAt);
  const readOnly =
    isTeacher || !isWriter || status === "submitted" || !group;

  const slots = useMemo(
    () => flattenFillSlots(prompt.fillInTranslation),
    [prompt.fillInTranslation]
  );

  const payload = useCallback(
    () => ({
      sessionId,
      groupId: group?.id ?? "",
      task1,
      task2,
      task3,
    }),
    [sessionId, group?.id, task1, task2, task3]
  );

  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (readOnly || !group) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setSaving(true);
      void saveExamAnswers(payload()).then((result) => {
        setSaving(false);
        if (!result.ok) setError(result.error);
      });
    }, 800);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [payload, readOnly, group]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isWriter || isTeacher || !group) return;
    const supabase = createClient();
    const apply = (row: {
      task1_answers?: unknown;
      task2_answers?: unknown;
      task3_answers?: unknown;
      status?: string;
    }) => {
      if (Array.isArray(row.task1_answers)) {
        setTask1(row.task1_answers as Task1Answer[]);
      }
      if (Array.isArray(row.task2_answers)) {
        setTask2(row.task2_answers as typeof task2);
      }
      if (Array.isArray(row.task3_answers)) {
        setTask3(row.task3_answers as Task3Answer[]);
      }
      if (row.status === "submitted" || row.status === "in_progress") {
        setStatus(row.status);
      }
    };
    const channel = supabase
      .channel(`exam-answers-${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_exam_submissions",
          filter: `exam_group_id=eq.${group.id}`,
        },
        (payload) => apply(payload.new as never)
      )
      .subscribe();
    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("group_exam_submissions")
        .select("task1_answers, task2_answers, task3_answers, status")
        .eq("exam_group_id", group.id)
        .maybeSingle();
      if (data) apply(data);
    }, 3000);
    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [isWriter, isTeacher, group]);

  const remaining = remainingMs(start, prompt.timeLimitMinutes, now);
  const inputClass =
    "min-h-11 w-full rounded-card border border-paper-line bg-white px-3 py-2 text-body-main text-text-primary focus:border-accent focus:outline-none";

  function task1Value(slotIndex: number) {
    return task1.find((row) => row.slotIndex === slotIndex)?.answer ?? "";
  }

  function setTask1Value(slotIndex: number, answer: string) {
    setTask1((current) => {
      const next = current.filter((row) => row.slotIndex !== slotIndex);
      next.push({ slotIndex, answer });
      return next;
    });
  }

  async function onSubmit() {
    if (!group) return;
    setError("");
    const result = await submitExamAnswers(payload());
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus("submitted");
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-paper-line bg-paper-header px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <BackLink href="/dashboard" showLabel />
          <div className="min-w-0">
            <p className="text-label-sm text-text-muted">Profe Kyle</p>
            <p className="text-label-sm text-text-muted">Examen</p>
            <h1 className="truncate font-heading text-headline-md text-text-primary">
              {prompt.title}
            </h1>
          </div>
          <p className="ml-auto text-headline-md tabular-nums text-text-primary">
            {formatCountdown(remaining)}
          </p>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-label-md text-text-secondary">
          Tarea {task} de 3
          {group ? ` · ${group.label}` : ""}
          {isWriter ? " · tú escribes" : group ? " · solo lectura" : ""}
          {saving ? " · guardando" : ""}
        </p>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-6">
        {!group && !isTeacher && (
          <p className="rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
            El Profe Kyle todavía te está poniendo en un grupo. Espera un
            momento.
          </p>
        )}

        {isTeacher && (
          <p className="mb-4 rounded-card bg-accent-softer px-3 py-3 text-body-main text-text-secondary">
            Así lo ven tus estudiantes. Arma los grupos desde la página de la
            clase.
          </p>
        )}

        {status === "submitted" && !showKeys && (
          <p className="mb-4 rounded-card bg-success-soft px-3 py-3 text-body-main text-success">
            Entregado. En la revisión vamos a mirar las respuestas juntos.
          </p>
        )}

        <div className="mb-4 flex gap-2">
          {[1, 2, 3].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTask(item)}
              className={`h-11 flex-1 rounded-card text-label-md ${
                task === item
                  ? "bg-accent text-white"
                  : "border border-paper-line text-text-secondary"
              }`}
            >
              Tarea {item}
            </button>
          ))}
        </div>

        {task === 1 && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setVocabOpen((value) => !value)}
              className="text-label-md text-text-accent"
            >
              {vocabOpen ? "Ocultar lista" : "Ver lista de vocabulario"}
            </button>
            {vocabOpen && (
              <ul className="rounded-card border border-paper-line bg-white px-3 py-3 text-body-main">
                {prompt.vocabularyList.map((item) => (
                  <li key={item.id} className="py-1">
                    <span className="font-medium">{item.english}</span>
                    <span className="text-text-muted"> · {item.spanish}</span>
                  </li>
                ))}
              </ul>
            )}
            {prompt.fillInTranslation.map((sentence) => {
              const sentenceSlots = slots.filter(
                (slot) => slot.sentenceNumber === sentence.number
              );
              const pieces = sentence.sentence.split(/(\([^)]+\))/g);
              let used = 0;
              return (
                <p
                  key={sentence.number}
                  className="font-heading text-body-lg leading-8 text-text-primary"
                >
                  <span className="text-text-muted">{sentence.number}. </span>
                  {pieces.map((piece, index) => {
                    if (!/^\([^)]+\)$/.test(piece)) {
                      return <span key={index}>{piece}</span>;
                    }
                    const slot = sentenceSlots[used];
                    used += 1;
                    if (!slot) return <span key={index}>{piece}</span>;
                    const typed = task1Value(slot.slotIndex);
                    const ok =
                      showKeys &&
                      typed.trim() &&
                      [
                        slot.slot.expectedEnglish,
                        ...slot.slot.acceptableVariations,
                      ].some(
                        (value) =>
                          value.toLowerCase() === typed.trim().toLowerCase()
                      );
                    return (
                      <span key={index} className="inline-block align-baseline">
                        <input
                          value={typed}
                          disabled={readOnly}
                          onChange={(event) =>
                            setTask1Value(slot.slotIndex, event.target.value)
                          }
                          aria-label={slot.slot.spanishWord}
                          className="mx-1 inline-block w-28 min-w-0 rounded-small border border-paper-line px-2 py-1 text-body-main disabled:bg-surface-hover"
                        />
                        {showKeys && (
                          <span
                            className={`ml-1 text-label-sm ${
                              ok ? "text-success" : "text-error"
                            }`}
                          >
                            {slot.slot.expectedEnglish}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </p>
              );
            })}
          </div>
        )}

        {task === 2 && prompt.task2Type === "paragraph_restructuring" && (
          <ol className="space-y-3">
            {(prompt.paragraphRestructuring ?? []).map((sentence) => {
              const letter =
                (task2 as ExamTask2LetterAnswer[]).find(
                  (row) => row.sentenceNumber === sentence.number
                )?.assignedLetter ?? "";
              return (
                <li
                  key={sentence.number}
                  className="rounded-card border border-paper-line bg-white px-3 py-3"
                >
                  <div className="flex items-start gap-3">
                    <input
                      value={letter}
                      disabled={readOnly}
                      maxLength={1}
                      onChange={(event) => {
                        const assignedLetter = event.target.value
                          .toUpperCase()
                          .replace(/[^A-H]/g, "")
                          .slice(0, 1);
                        setTask2((current) => {
                          const next = (
                            current as ExamTask2LetterAnswer[]
                          ).filter(
                            (row) => row.sentenceNumber !== sentence.number
                          );
                          next.push({
                            sentenceNumber: sentence.number,
                            assignedLetter,
                          });
                          return next;
                        });
                      }}
                      aria-label={`Letra para la oración ${sentence.number}`}
                      className="h-11 w-11 shrink-0 rounded-small border border-paper-line text-center uppercase disabled:bg-surface-hover"
                    />
                    <p className="pt-2 text-body-main text-text-primary">
                      {sentence.number}. {sentence.sentence}
                    </p>
                  </div>
                  {showKeys && (
                    <p className="mt-2 text-label-sm text-text-muted">
                      Va en {sentence.correctPosition}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {task === 2 && prompt.task2Type === "sentence_correction" && (
          <ol className="space-y-3">
            {(prompt.sentenceCorrection ?? []).map((sentence) => {
              const row = (task2 as ExamTask2CorrectionAnswer[]).find(
                (item) => item.sentenceNumber === sentence.number
              );
              const markedCorrect = row?.isCorrect ?? false;
              return (
                <li
                  key={sentence.number}
                  className="rounded-card border border-paper-line bg-white px-3 py-3"
                >
                  <p className="text-body-main text-text-primary">
                    {sentence.number}. {sentence.sentence}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        setTask2((current) => {
                          const next = (
                            current as ExamTask2CorrectionAnswer[]
                          ).filter(
                            (item) => item.sentenceNumber !== sentence.number
                          );
                          next.push({
                            sentenceNumber: sentence.number,
                            isCorrect: true,
                            correctedText: null,
                          });
                          return next;
                        })
                      }
                      className={`h-11 flex-1 rounded-card text-label-md ${
                        markedCorrect
                          ? "bg-success text-white"
                          : "border border-paper-line"
                      }`}
                    >
                      Correcta
                    </button>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        setTask2((current) => {
                          const next = (
                            current as ExamTask2CorrectionAnswer[]
                          ).filter(
                            (item) => item.sentenceNumber !== sentence.number
                          );
                          next.push({
                            sentenceNumber: sentence.number,
                            isCorrect: false,
                            correctedText: row?.correctedText ?? "",
                          });
                          return next;
                        })
                      }
                      className={`h-11 flex-1 rounded-card text-label-md ${
                        row && !row.isCorrect
                          ? "bg-accent text-white"
                          : "border border-paper-line"
                      }`}
                    >
                      Corregir
                    </button>
                  </div>
                  {row && !row.isCorrect && (
                    <textarea
                      value={row.correctedText ?? ""}
                      disabled={readOnly}
                      onChange={(event) =>
                        setTask2((current) => {
                          const next = (
                            current as ExamTask2CorrectionAnswer[]
                          ).filter(
                            (item) => item.sentenceNumber !== sentence.number
                          );
                          next.push({
                            sentenceNumber: sentence.number,
                            isCorrect: false,
                            correctedText: event.target.value,
                          });
                          return next;
                        })
                      }
                      className={`${inputClass} mt-2`}
                      rows={2}
                    />
                  )}
                  {showKeys && (
                    <p className="mt-2 text-label-sm text-text-muted">
                      {sentence.isCorrect
                        ? "Estaba bien."
                        : `Corrección: ${sentence.correctedVersion}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {task === 3 && (
          <ol className="space-y-3">
            {prompt.translationSentences.map((sentence) => {
              const value =
                task3.find((row) => row.sentenceNumber === sentence.number)
                  ?.englishTranslation ?? "";
              return (
                <li
                  key={sentence.number}
                  className="rounded-card border border-paper-line bg-white px-3 py-3"
                >
                  <p className="text-body-main text-text-primary">
                    {sentence.number}. {sentence.spanish}
                  </p>
                  <textarea
                    value={value}
                    disabled={readOnly}
                    onChange={(event) =>
                      setTask3((current) => {
                        const next = current.filter(
                          (row) => row.sentenceNumber !== sentence.number
                        );
                        next.push({
                          sentenceNumber: sentence.number,
                          englishTranslation: event.target.value,
                        });
                        return next;
                      })
                    }
                    className={`${inputClass} mt-2`}
                    rows={2}
                  />
                  {showKeys && (
                    <p className="mt-2 text-label-sm text-text-muted">
                      {[
                        ...sentence.acceptedEnglish,
                        ...sentence.acceptableVariations,
                      ].join(" / ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {error && <p className="mt-4 text-sm text-error">{error}</p>}

        {isWriter && status !== "submitted" && group && (
          <button
            type="button"
            onClick={() => void onSubmit()}
            className="mt-6 h-12 w-full rounded-card bg-accent text-label-md font-medium text-white"
          >
            Entregar
          </button>
        )}
      </section>
    </main>
  );
}
