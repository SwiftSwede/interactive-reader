"use client";

import { useState } from "react";
import type { PresentationQuestion, PresentationSegment, PresentationVocabItem } from "@/types";
import { nextStableId, type PresentationForEdit } from "@/lib/content-editor";
import {
  AddButton,
  EditorField,
  EditorSection,
  ReorderControls,
  SaveBar,
  WarningBanner,
  fieldClass,
  moveItem,
} from "@/components/teacher/content/editor-ui";
import { savePresentationAction } from "@/app/teacher/content/actions";

export default function PresentationEditor({
  prompt,
}: {
  prompt: PresentationForEdit;
}) {
  const [title, setTitle] = useState(prompt.title);
  const [theme, setTheme] = useState(prompt.theme ?? "");
  const [warmup, setWarmup] = useState(prompt.warmupQuestion ?? "");
  const [segments, setSegments] = useState(prompt.segments);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const snapshot = JSON.stringify({ title, theme, warmup, segments });
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  function updateSegment(index: number, next: PresentationSegment) {
    const copy = [...segments];
    copy[index] = next;
    setSegments(copy);
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-8">
      {prompt.responseCount > 0 ? (
        <WarningBanner>
          Esta lección ya tiene {prompt.responseCount} respuestas de
          estudiantes. Cambiar el contenido puede desincronizar las preguntas
          con las respuestas.
        </WarningBanner>
      ) : null}
      <EditorSection title="Presentación">
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
        <EditorField label="Tema">
          <input
            className={fieldClass}
            value={theme}
            onChange={(event) => {
              setTheme(event.target.value);
              setSaved(false);
            }}
          />
        </EditorField>
        <EditorField label="Warm-up (opcional)">
          <input
            className={fieldClass}
            value={warmup}
            onChange={(event) => {
              setWarmup(event.target.value);
              setSaved(false);
            }}
          />
        </EditorField>
      </EditorSection>

      {segments.map((segment, index) => (
        <EditorSection key={segment.id} title={`Segmento ${index + 1} (id ${segment.id})`}>
          <div className="flex justify-end">
            <ReorderControls
              index={index}
              total={segments.length}
              onMove={(direction) => {
                setSegments(moveItem(segments, index, direction));
                setSaved(false);
              }}
              onDelete={() => {
                if (!window.confirm("¿Quito este segmento?")) return;
                setSegments(segments.filter((item) => item.id !== segment.id));
                setSaved(false);
              }}
              deleteLabel="Quitar segmento"
            />
          </div>
          <EditorField label="Título del segmento">
            <input
              className={fieldClass}
              value={segment.title ?? ""}
              onChange={(event) =>
                updateSegment(index, {
                  ...segment,
                  title: event.target.value || null,
                })
              }
            />
          </EditorField>
          <EditorField label="YouTube">
            <input
              className={fieldClass}
              value={segment.youtubeUrl}
              onChange={(event) =>
                updateSegment(index, {
                  ...segment,
                  youtubeUrl: event.target.value,
                })
              }
            />
          </EditorField>

          <p className="text-label-md text-text-secondary">Vocabulario</p>
          {segment.vocabulary.map((item, vocabIndex) => (
            <VocabRow
              key={`${item.english}-${vocabIndex}`}
              item={item}
              index={vocabIndex}
              total={segment.vocabulary.length}
              onChange={(nextItem) => {
                const vocabulary = [...segment.vocabulary];
                vocabulary[vocabIndex] = nextItem;
                updateSegment(index, { ...segment, vocabulary });
              }}
              onMove={(direction) =>
                updateSegment(index, {
                  ...segment,
                  vocabulary: moveItem(segment.vocabulary, vocabIndex, direction),
                })
              }
              onDelete={() =>
                updateSegment(index, {
                  ...segment,
                  vocabulary: segment.vocabulary.filter((_, i) => i !== vocabIndex),
                })
              }
            />
          ))}
          <AddButton
            label="+ Agregar"
            onClick={() =>
              updateSegment(index, {
                ...segment,
                vocabulary: [
                  ...segment.vocabulary,
                  { english: "", spanish: "", exampleSentence: null },
                ],
              })
            }
          />

          <p className="mt-2 text-label-md text-text-secondary">Preguntas</p>
          {segment.comprehensionQuestions.map((item, qIndex) => (
            <QuestionRow
              key={item.id}
              item={item}
              index={qIndex}
              total={segment.comprehensionQuestions.length}
              onChange={(nextItem) => {
                const comprehensionQuestions = [
                  ...segment.comprehensionQuestions,
                ];
                comprehensionQuestions[qIndex] = nextItem;
                updateSegment(index, { ...segment, comprehensionQuestions });
              }}
              onMove={(direction) =>
                updateSegment(index, {
                  ...segment,
                  comprehensionQuestions: moveItem(
                    segment.comprehensionQuestions,
                    qIndex,
                    direction
                  ),
                })
              }
              onDelete={() =>
                updateSegment(index, {
                  ...segment,
                  comprehensionQuestions: segment.comprehensionQuestions.filter(
                    (row) => row.id !== item.id
                  ),
                })
              }
            />
          ))}
          <AddButton
            label="+ Agregar"
            onClick={() =>
              updateSegment(index, {
                ...segment,
                comprehensionQuestions: [
                  ...segment.comprehensionQuestions,
                  {
                    id: nextStableId(
                      segment.comprehensionQuestions.map((row) => row.id)
                    ),
                    question: "",
                    answer: "",
                  },
                ],
              })
            }
          />
        </EditorSection>
      ))}

      <AddButton
        label="+ Agregar segmento"
        onClick={() =>
          setSegments([
            ...segments,
            {
              id: nextStableId(segments.map((row) => row.id)),
              youtubeUrl: "",
              title: null,
              vocabulary: [],
              comprehensionQuestions: [],
            },
          ])
        }
      />

      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={async () => {
          setPending(true);
          setError("");
          const result = await savePresentationAction(prompt.id, {
            title,
            theme,
            warmupQuestion: warmup,
            segments,
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
    </div>
  );
}

function VocabRow({
  item,
  index,
  total,
  onChange,
  onMove,
  onDelete,
}: {
  item: PresentationVocabItem;
  index: number;
  total: number;
  onChange: (item: PresentationVocabItem) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-card border border-paper-line p-4">
      <div className="mb-3 flex justify-end">
        <ReorderControls
          index={index}
          total={total}
          onMove={onMove}
          onDelete={onDelete}
          deleteLabel="Quitar vocabulario"
        />
      </div>
      <input
        className={fieldClass}
        placeholder="English"
        value={item.english}
        onChange={(event) => onChange({ ...item, english: event.target.value })}
      />
      <input
        className={`${fieldClass} mt-3`}
        placeholder="Español"
        value={item.spanish}
        onChange={(event) => onChange({ ...item, spanish: event.target.value })}
      />
      <input
        className={`${fieldClass} mt-3`}
        placeholder="Ejemplo (opcional)"
        value={item.exampleSentence ?? ""}
        onChange={(event) =>
          onChange({
            ...item,
            exampleSentence: event.target.value || null,
          })
        }
      />
    </div>
  );
}

function QuestionRow({
  item,
  index,
  total,
  onChange,
  onMove,
  onDelete,
}: {
  item: PresentationQuestion;
  index: number;
  total: number;
  onChange: (item: PresentationQuestion) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-card border border-paper-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-label-sm text-text-muted">id {item.id}</p>
        <ReorderControls
          index={index}
          total={total}
          onMove={onMove}
          onDelete={onDelete}
          deleteLabel="Quitar pregunta"
        />
      </div>
      <textarea
        className={fieldClass}
        rows={2}
        placeholder="Pregunta"
        value={item.question}
        onChange={(event) => onChange({ ...item, question: event.target.value })}
      />
      <input
        className={`${fieldClass} mt-3`}
        placeholder="Respuesta"
        value={item.answer}
        onChange={(event) => onChange({ ...item, answer: event.target.value })}
      />
    </div>
  );
}
