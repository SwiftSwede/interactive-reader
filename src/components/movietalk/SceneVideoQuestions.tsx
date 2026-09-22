"use client";

import { useEffect, useRef, useState } from "react";
import ClassroomYoutubePlayer from "@/components/ClassroomYoutubePlayer";
import { saveComprehensionResponse } from "@/app/lesson/[slug]/actions";
import { draftKey, readDraft, writeDraft } from "@/lib/answer-drafts";
import { youtubeEmbedId } from "@/lib/youtube-sync";
import type { CompQuestionRow, MovieTalkSceneRow } from "@/lib/stories";
import type { SavedComprehensionResponse } from "@/components/ComprehensionQuestions";

const SAVE_DEBOUNCE_MS = 600;

export default function SceneVideoQuestions({
  scene,
  questions,
  title,
  sessionId,
  isTeacher,
  live,
  classAnswers,
  savedResponses,
  saveResponses = true,
  onClassAnswer,
  onClassBlur,
}: {
  scene: MovieTalkSceneRow | undefined;
  questions: CompQuestionRow[];
  title: string;
  sessionId?: string;
  isTeacher: boolean;
  live: boolean;
  classAnswers: Record<number, string>;
  savedResponses?: SavedComprehensionResponse[];
  saveResponses?: boolean;
  onClassAnswer: (position: number, typed: string) => void;
  onClassBlur: () => void;
}) {
  const videoId = youtubeEmbedId(scene?.youtube_url);
  const startSeconds = scene?.start_seconds ?? 0;
  const endSeconds =
    scene?.end_seconds != null && scene.end_seconds > 0
      ? scene.end_seconds
      : undefined;

  const byId = new Map(
    (savedResponses ?? []).map((row) => [row.questionId, row] as const)
  );
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const q of questions) {
      next[q.id] = byId.get(q.id)?.responseText ?? "";
    }
    return next;
  });
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const extra: Record<string, string> = {};
    for (const q of questions) {
      if (answers[q.id]) continue;
      const draft = readDraft<{ responseText?: string }>(
        draftKey("comprehension", q.id)
      );
      if (draft?.responseText) extra[q.id] = draft.responseText;
    }
    if (Object.keys(extra).length > 0) {
      setAnswers((prev) => ({ ...extra, ...prev }));
    }
    // Server-hydrated answers win; only fill gaps on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of Object.values(timers)) window.clearTimeout(id);
    };
  }, []);

  function persist(questionId: string, text: string) {
    writeDraft(draftKey("comprehension", questionId), {
      responseText: text,
    });
    if (!sessionId || isTeacher || !saveResponses) return;
    void saveComprehensionResponse({
      questionId,
      responseText: text.slice(0, 500),
      sessionId,
    });
  }

  function onStudentChange(questionId: string, text: string) {
    setAnswers((current) => ({ ...current, [questionId]: text }));
    if (timersRef.current[questionId]) {
      window.clearTimeout(timersRef.current[questionId]);
    }
    timersRef.current[questionId] = window.setTimeout(() => {
      persist(questionId, text);
    }, SAVE_DEBOUNCE_MS);
  }

  return (
    <div>
      <h2 className="text-headline-lg text-text-primary mb-4">
        Video y preguntas
      </h2>
      {videoId ? (
        <div className="mb-6">
          <ClassroomYoutubePlayer
            videoId={videoId}
            title={title}
            sessionId={sessionId}
            isTeacher={isTeacher}
            live={live && Boolean(sessionId)}
            startSeconds={startSeconds}
            endSeconds={endSeconds}
          />
        </div>
      ) : (
        <div className="mb-6 rounded-card border border-paper-line bg-surface p-5">
          <p className="text-body-main text-text-secondary">Clip no disponible</p>
        </div>
      )}

      <div className="space-y-5">
        {questions.map((question) => {
          const teacherAnswer = (classAnswers[question.position] ?? "").trim();
          return (
            <div key={question.id}>
              <label
                htmlFor={`mt-q-${question.id}`}
                className="mb-2 block text-body-main text-text-primary"
              >
                {question.position}. {question.question}
              </label>
              {!isTeacher ? (
                <textarea
                  id={`mt-q-${question.id}`}
                  className="min-h-24 w-full rounded-card border border-paper-line bg-surface p-3 text-body-main text-text-primary focus:border-accent focus:outline-none disabled:bg-surface-hover"
                  value={answers[question.id] ?? ""}
                  onChange={(e) => onStudentChange(question.id, e.target.value)}
                  onBlur={() => persist(question.id, answers[question.id] ?? "")}
                  maxLength={500}
                  placeholder="Tu respuesta (opcional)"
                  disabled={!saveResponses}
                />
              ) : null}
              {isTeacher ? (
                <div>
                  <label
                    htmlFor={`mt-class-${question.id}`}
                    className="mb-2 mt-1 block text-label-md text-text-secondary"
                  >
                    Tu respuesta para la clase
                  </label>
                  <textarea
                    id={`mt-class-${question.id}`}
                    className="min-h-24 w-full rounded-card border border-paper-line bg-surface p-3 text-body-main text-text-primary focus:border-accent focus:outline-none"
                    value={classAnswers[question.position] ?? ""}
                    onChange={(e) =>
                      onClassAnswer(question.position, e.target.value)
                    }
                    onBlur={onClassBlur}
                    maxLength={500}
                  />
                </div>
              ) : teacherAnswer ? (
                <div className="mt-3 rounded-card border border-paper-line bg-surface-hover p-4">
                  <p className="mb-1 text-label-md text-text-secondary">
                    El Profe Kyle respondió:
                  </p>
                  <p className="whitespace-pre-wrap text-body-main text-text-primary">
                    {teacherAnswer}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
