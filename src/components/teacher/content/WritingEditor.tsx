"use client";

import { useState } from "react";
import type { WritingPrompt } from "@/types";
import {
  AddButton,
  EditorField,
  EditorSection,
  ReorderControls,
  SaveBar,
  fieldClass,
  moveItem,
} from "@/components/teacher/content/editor-ui";
import { saveWritingAction } from "@/app/teacher/content/actions";
import {
  joinWritingQuestions,
  MAX_INTERMEDIATE_WRITING_QUESTIONS,
  splitWritingQuestions,
} from "@/lib/writing";

function initialQuestions(promptText: string): string[] {
  const questions = splitWritingQuestions(promptText);
  return questions.length > 0 ? questions : [""];
}

export default function WritingEditor({ prompt }: { prompt: WritingPrompt }) {
  const intermediate = prompt.level === "intermediate";
  const [title, setTitle] = useState(prompt.title);
  const [promptText, setPromptText] = useState(prompt.promptText);
  const [questions, setQuestions] = useState(() =>
    initialQuestions(prompt.promptText)
  );
  const [minutes, setMinutes] = useState(prompt.writingTimeMinutes);
  const [structure, setStructure] = useState(prompt.structureLesson ?? "");
  const [rubric, setRubric] = useState(prompt.rubricText ?? "");
  const [example, setExample] = useState(prompt.exampleParagraph ?? "");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const snapshot = JSON.stringify({
    title,
    promptText: intermediate ? joinWritingQuestions(questions) : promptText,
    minutes,
    structure,
    rubric,
    example,
  });
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  return (
    <EditorSection title="Escritura">
      <EditorField label="Título">
        <input
          className={fieldClass}
          maxLength={120}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      {intermediate ? (
        <div className="flex flex-col gap-3">
          {questions.map((question, index) => (
            <div
              key={index}
              className="rounded-card border border-paper-line p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-label-md text-text-secondary">
                  Pregunta {index + 1}
                </p>
                {questions.length > 1 ? (
                  <ReorderControls
                    index={index}
                    total={questions.length}
                    onMove={(direction) => {
                      setQuestions(moveItem(questions, index, direction));
                      setSaved(false);
                    }}
                    onDelete={() => {
                      setQuestions(questions.filter((_, item) => item !== index));
                      setSaved(false);
                    }}
                    deleteLabel="Quitar pregunta"
                  />
                ) : null}
              </div>
              <textarea
                className={fieldClass}
                rows={3}
                value={question}
                onChange={(event) => {
                  const next = [...questions];
                  next[index] = event.target.value;
                  setQuestions(next);
                  setSaved(false);
                }}
              />
            </div>
          ))}
          {questions.length < MAX_INTERMEDIATE_WRITING_QUESTIONS ? (
            <AddButton
              label="+ Agregar pregunta"
              onClick={() => {
                setQuestions([...questions, ""]);
                setSaved(false);
              }}
            />
          ) : null}
          <p className="text-label-sm text-text-muted">
            Hasta {MAX_INTERMEDIATE_WRITING_QUESTIONS}. Los estudiantes las ven
            numeradas.
          </p>
        </div>
      ) : (
        <EditorField label="Pregunta">
          <textarea
            className={fieldClass}
            rows={6}
            value={promptText}
            onChange={(event) => {
              setPromptText(event.target.value);
              setSaved(false);
            }}
          />
        </EditorField>
      )}
      <EditorField label="Minutos">
        <select
          className={fieldClass}
          value={minutes}
          onChange={(event) => {
            setMinutes(Number(event.target.value));
            setSaved(false);
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
      </EditorField>
      <EditorField label="Estructura">
        <textarea
          className={fieldClass}
          rows={6}
          value={structure}
          onChange={(event) => {
            setStructure(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Rúbrica TOEFL/IELTS">
        <textarea
          className={fieldClass}
          rows={6}
          value={rubric}
          onChange={(event) => {
            setRubric(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <EditorField label="Ejemplo">
        <textarea
          className={fieldClass}
          rows={8}
          value={example}
          onChange={(event) => {
            setExample(event.target.value);
            setSaved(false);
          }}
        />
      </EditorField>
      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          setPending(true);
          setError("");
          const savedPrompt = intermediate
            ? joinWritingQuestions(questions)
            : promptText;
          const result = await saveWritingAction(prompt.id, {
            title,
            promptText: savedPrompt,
            writingTimeMinutes: minutes,
            structureLesson: structure,
            rubricText: rubric,
            exampleParagraph: example,
          });
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          if (intermediate) {
            const next = splitWritingQuestions(savedPrompt);
            setQuestions(next.length > 0 ? next : [""]);
          }
          setBaseline(
            JSON.stringify({
              title,
              promptText: savedPrompt,
              minutes,
              structure,
              rubric,
              example,
            })
          );
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}
