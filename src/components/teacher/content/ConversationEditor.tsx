"use client";

import { useState } from "react";
import { nextStableId, type ConversationForEdit } from "@/lib/content-editor";
import {
  AddButton,
  EditorField,
  EditorSection,
  ReorderControls,
  SaveBar,
  fieldClass,
  moveItem,
} from "@/components/teacher/content/editor-ui";
import { saveConversationAction } from "@/app/teacher/content/actions";

export default function ConversationEditor({
  prompt,
}: {
  prompt: ConversationForEdit;
}) {
  const [title, setTitle] = useState(prompt.title);
  const [theme, setTheme] = useState(prompt.theme ?? "");
  const [questions, setQuestions] = useState(prompt.questions);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const snapshot = JSON.stringify({ title, theme, questions });
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  return (
    <EditorSection title="Conversación">
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
      {questions.map((row, index) => (
        <div key={row.id} className="rounded-card border border-paper-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-label-md text-text-secondary">
              Pregunta {index + 1} · id {row.id}
            </p>
            <ReorderControls
              index={index}
              total={questions.length}
              onMove={(direction) => {
                setQuestions(moveItem(questions, index, direction));
                setSaved(false);
              }}
              onDelete={() => {
                if (questions.length <= 3) return;
                setQuestions(questions.filter((item) => item.id !== row.id));
                setSaved(false);
              }}
              deleteLabel="Quitar pregunta"
            />
          </div>
          <textarea
            className={fieldClass}
            rows={3}
            value={row.question}
            onChange={(event) => {
              const next = [...questions];
              next[index] = { ...row, question: event.target.value };
              setQuestions(next);
              setSaved(false);
            }}
          />
        </div>
      ))}
      {questions.length < 6 ? (
        <AddButton
          label="+ Agregar"
          onClick={() => {
            setQuestions([
              ...questions,
              {
                id: nextStableId(questions.map((row) => row.id)),
                question: "",
              },
            ]);
            setSaved(false);
          }}
        />
      ) : null}
      <p className="text-label-sm text-text-muted">De 3 a 6 preguntas.</p>
      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          setPending(true);
          setError("");
          const result = await saveConversationAction(prompt.id, {
            title,
            theme,
            questions,
          });
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBaseline(snapshot);
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}
