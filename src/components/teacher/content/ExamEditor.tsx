"use client";

import { useMemo, useState } from "react";
import type { ExamForEdit } from "@/lib/content-editor";
import {
  EditorField,
  EditorSection,
  SaveBar,
  WarningBanner,
  fieldClass,
  monoFieldClass,
} from "@/components/teacher/content/editor-ui";
import { saveExamAction } from "@/app/teacher/content/actions";
import { parseExamForm as parseForm } from "@/lib/exam";

export default function ExamEditor({ exam }: { exam: ExamForEdit }) {
  const [title, setTitle] = useState(exam.title);
  const [theme, setTheme] = useState(exam.theme ?? "");
  const [minutes, setMinutes] = useState(exam.timeLimitMinutes);
  const [vocabRaw, setVocabRaw] = useState(exam.vocabRaw);
  const [task1Raw, setTask1Raw] = useState(exam.task1Raw);
  const [task2Raw, setTask2Raw] = useState(exam.task2Raw);
  const [task3Raw, setTask3Raw] = useState(exam.task3Raw);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const snapshot = JSON.stringify({
    title,
    theme,
    minutes,
    vocabRaw,
    task1Raw,
    task2Raw,
    task3Raw,
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
      ? "Tarea 2: reordenar párrafo (letra | oración)"
      : "Tarea 2: corrección (ok | oración  o  fix | mal | bien)";

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
      <EditorField label="Minutos">
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
      <EditorField
        label="Vocabulario"
        hint="english | spanish, una por línea"
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
        hint="{español|english|variante}"
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
      <EditorField label={task2Label}>
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
      <EditorField
        label="Tarea 3: traducción"
        hint="español | english | variación"
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
        <p className="text-sm text-text-secondary">
          Vista previa: {live.vocabularyList.length} palabras ·{" "}
          {live.fillInTranslation[0]?.sentence ?? "sin Tarea 1"} · Tarea 2{" "}
          {(live.paragraphRestructuring ?? live.sentenceCorrection ?? []).length}{" "}
          · Tarea 3 {live.translationSentences.length}
        </p>
      )}
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
