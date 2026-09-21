"use client";

import { useState } from "react";
import type { WritingPrompt } from "@/types";
import {
  EditorField,
  EditorSection,
  SaveBar,
  fieldClass,
} from "@/components/teacher/content/editor-ui";
import { saveWritingAction } from "@/app/teacher/content/actions";

export default function WritingEditor({ prompt }: { prompt: WritingPrompt }) {
  const [title, setTitle] = useState(prompt.title);
  const [promptText, setPromptText] = useState(prompt.promptText);
  const [minutes, setMinutes] = useState(prompt.writingTimeMinutes);
  const [structure, setStructure] = useState(prompt.structureLesson ?? "");
  const [rubric, setRubric] = useState(prompt.rubricText ?? "");
  const [example, setExample] = useState(prompt.exampleParagraph ?? "");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const snapshot = JSON.stringify({
    title,
    promptText,
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
      <EditorField label="Rúbrica">
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
      <EditorField label="Párrafo de ejemplo">
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
          const result = await saveWritingAction(prompt.id, {
            title,
            promptText,
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
          setBaseline(snapshot);
          setSaved(true);
        }}
      />
    </EditorSection>
  );
}
