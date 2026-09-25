"use client";

import { useMemo, useState } from "react";
import type { ExamClassSessionOption, ExamForEdit } from "@/lib/content-editor";
import {
  EditorField,
  EditorSection,
  SaveBar,
  WarningBanner,
  fieldClass,
  monoFieldClass,
} from "@/components/teacher/content/editor-ui";
import ExamAnswersSection from "@/components/teacher/content/ExamAnswersSection";
import ExamLivePreview from "@/components/teacher/content/ExamLivePreview";
import {
  copyExamClassAnswersAction,
  saveExamAction,
} from "@/app/teacher/content/actions";
import {
  parseExamForm as parseForm,
  serializeFillInTranslation,
  serializeSentenceCorrection,
  serializeTranslationSentences,
} from "@/lib/exam";
import type {
  ExamCorrectionItem,
  ExamFillSentence,
  ExamTranslationItem,
} from "@/types";

export default function ExamEditor({
  exam,
  sessions,
}: {
  exam: ExamForEdit;
  sessions: ExamClassSessionOption[];
}) {
  const [title, setTitle] = useState(exam.title);
  const [theme, setTheme] = useState(exam.theme ?? "");
  const [minutes, setMinutes] = useState(exam.timeLimitMinutes);
  const [vocabRaw, setVocabRaw] = useState(exam.vocabRaw);
  const [task1Raw, setTask1Raw] = useState(exam.task1Raw);
  const [task2Raw, setTask2Raw] = useState(exam.task2Raw);
  const [task3Raw, setTask3Raw] = useState(exam.task3Raw);
  const [task1Title, setTask1Title] = useState(exam.task1Title);
  const [task1Instructions, setTask1Instructions] = useState(
    exam.task1Instructions
  );
  const [task2Title, setTask2Title] = useState(exam.task2Title);
  const [task2Instructions, setTask2Instructions] = useState(
    exam.task2Instructions
  );
  const [task3Title, setTask3Title] = useState(exam.task3Title);
  const [task3Instructions, setTask3Instructions] = useState(
    exam.task3Instructions
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [copyPending, setCopyPending] = useState(false);
  const [copyError, setCopyError] = useState("");
  const snapshot = JSON.stringify({
    title,
    theme,
    minutes,
    vocabRaw,
    task1Raw,
    task2Raw,
    task3Raw,
    task1Title,
    task1Instructions,
    task2Title,
    task2Instructions,
    task3Title,
    task3Instructions,
  });
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  const live = useMemo(
    () =>
      parseForm({
        title,
        theme,
        vocabRaw,
        task1Raw,
        task2Type: exam.task2Type,
        task2Raw,
        task3Raw,
        timeLimitMinutes: minutes,
      }),
    [title, theme, vocabRaw, task1Raw, task2Raw, task3Raw, minutes, exam.task2Type]
  );

  const task2Label =
    exam.task2Type === "paragraph_restructuring"
      ? "Tarea 2: reordenar párrafo"
      : "Tarea 2: corrección";
  const task2Hint =
    exam.task2Type === "paragraph_restructuring"
      ? "Oraciones en orden correcto, una por línea"
      : "Una oración por línea. Marca ok/fix después en clase.";

  function markDirty() {
    setSaved(false);
  }

  function onFillChange(sentences: ExamFillSentence[]) {
    setTask1Raw(serializeFillInTranslation(sentences));
    markDirty();
  }

  function onCorrectionsChange(items: ExamCorrectionItem[]) {
    setTask2Raw(serializeSentenceCorrection(items));
    markDirty();
  }

  function onTranslationsChange(items: ExamTranslationItem[]) {
    setTask3Raw(serializeTranslationSentences(items));
    markDirty();
  }

  return (
    <EditorSection title="Examen">
      <EditorField label="Título">
        <input
          className={fieldClass}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Tema (opcional)">
        <input
          className={fieldClass}
          value={theme}
          onChange={(event) => {
            setTheme(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Minutos de reposición">
        <input
          type="number"
          min={1}
          max={90}
          className={fieldClass}
          value={minutes}
          onChange={(event) => {
            setMinutes(Number(event.target.value));
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Tarea 1 título (inglés)">
        <input
          className={fieldClass}
          value={task1Title}
          onChange={(event) => {
            setTask1Title(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Tarea 1 instrucciones (inglés)">
        <textarea
          className={fieldClass}
          rows={2}
          value={task1Instructions}
          onChange={(event) => {
            setTask1Instructions(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField
        label="Vocabulario"
        hint="english o english | spanish"
      >
        <textarea
          className={monoFieldClass}
          rows={8}
          value={vocabRaw}
          onChange={(event) => {
            setVocabRaw(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField
        label="Tarea 1: huecos"
        hint="Oraciones con (español) en paréntesis"
      >
        <textarea
          className={monoFieldClass}
          rows={8}
          value={task1Raw}
          onChange={(event) => {
            setTask1Raw(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Tarea 2 título (inglés)">
        <input
          className={fieldClass}
          value={task2Title}
          onChange={(event) => {
            setTask2Title(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Tarea 2 instrucciones (inglés)">
        <textarea
          className={fieldClass}
          rows={2}
          value={task2Instructions}
          onChange={(event) => {
            setTask2Instructions(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label={task2Label} hint={task2Hint}>
        <textarea
          className={monoFieldClass}
          rows={8}
          value={task2Raw}
          onChange={(event) => {
            setTask2Raw(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Tarea 3 título (inglés)">
        <input
          className={fieldClass}
          value={task3Title}
          onChange={(event) => {
            setTask3Title(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Tarea 3 instrucciones (inglés)">
        <textarea
          className={fieldClass}
          rows={2}
          value={task3Instructions}
          onChange={(event) => {
            setTask3Instructions(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField
        label="Tarea 3: traducción"
        hint="Español, una por línea. Respuestas después de clase."
      >
        <textarea
          className={monoFieldClass}
          rows={8}
          value={task3Raw}
          onChange={(event) => {
            setTask3Raw(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      {live.error ? (
        <WarningBanner>{live.error}</WarningBanner>
      ) : (
        <ExamLivePreview live={live} promptId={exam.id} />
      )}
      <ExamAnswersSection
        live={live}
        sessions={sessions}
        copyPending={copyPending}
        copyError={copyError}
        onFillChange={onFillChange}
        onCorrectionsChange={onCorrectionsChange}
        onTranslationsChange={onTranslationsChange}
        onCopyFromClass={async (sessionId) => {
          setCopyPending(true);
          setCopyError("");
          const result = await copyExamClassAnswersAction(exam.id, sessionId);
          setCopyPending(false);
          if (!result.ok) {
            setCopyError(result.error);
            return;
          }
          setTask1Raw(result.task1Raw);
          setTask2Raw(result.task2Raw);
          setTask3Raw(result.task3Raw);
          markDirty();
        }}
      />
      {preview && !dirty ? (
        <p className="text-sm text-text-secondary">{preview}</p>
      ) : null}
      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          setPending(true);
          setError("");
          const result = await saveExamAction(exam.id, {
            title,
            theme,
            vocabRaw,
            task1Raw,
            task2Type: exam.task2Type,
            task2Raw,
            task3Raw,
            timeLimitMinutes: minutes,
            task1Title,
            task1Instructions,
            task2Title,
            task2Instructions,
            task3Title,
            task3Instructions,
          });
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            setPreview("");
            return;
          }
          setPreview(result.preview ?? "");
          setBaseline(snapshot);
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}
