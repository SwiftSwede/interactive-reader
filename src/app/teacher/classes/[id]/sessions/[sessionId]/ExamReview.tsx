"use client";

import { useMemo, useState } from "react";
import { flattenFillSlots } from "@/lib/exam";
import type { GroupExamPrompt } from "@/types";

type GroupView = {
  id: string;
  label: string;
  task1: Array<{ slotIndex: number; answer: string }>;
  task2: Array<{
    sentenceNumber: number;
    assignedLetter?: string;
    isCorrect?: boolean;
    correctedText?: string | null;
  }>;
  task3: Array<{ sentenceNumber: number; englishTranslation: string }>;
};

type ReviewItem = {
  key: string;
  task: number;
  prompt: string;
  correct: string;
  answers: Array<{ group: string; text: string }>;
};

function asTask1(value: unknown): GroupView["task1"] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is { slotIndex: number; answer: string } =>
      row &&
      typeof row === "object" &&
      typeof (row as { slotIndex?: unknown }).slotIndex === "number"
  );
}

function asTask2(value: unknown): GroupView["task2"] {
  if (!Array.isArray(value)) return [];
  return value as GroupView["task2"];
}

function asTask3(value: unknown): GroupView["task3"] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is { sentenceNumber: number; englishTranslation: string } =>
      row && typeof row === "object"
  );
}

export default function ExamReview({
  prompt,
  groups,
}: {
  prompt: GroupExamPrompt;
  groups: GroupView[];
}) {
  const items = useMemo(() => {
    const list: ReviewItem[] = [];
    const slots = flattenFillSlots(prompt.fillInTranslation);
    for (const slot of slots) {
      list.push({
        key: `t1-${slot.slotIndex}`,
        task: 1,
        prompt: `(${slot.slot.spanishWord})`,
        correct: [slot.slot.expectedEnglish, ...slot.slot.acceptableVariations]
          .filter(Boolean)
          .join(" / "),
        answers: groups.map((group) => ({
          group: group.label,
          text:
            group.task1.find((row) => row.slotIndex === slot.slotIndex)
              ?.answer ?? "",
        })),
      });
    }

    if (prompt.task2Type === "paragraph_restructuring") {
      for (const sentence of prompt.paragraphRestructuring ?? []) {
        list.push({
          key: `t2-${sentence.number}`,
          task: 2,
          prompt: `${sentence.number}. ${sentence.sentence}`,
          correct: sentence.correctPosition,
          answers: groups.map((group) => ({
            group: group.label,
            text:
              group.task2.find((row) => row.sentenceNumber === sentence.number)
                ?.assignedLetter ?? "",
          })),
        });
      }
    } else {
      for (const sentence of prompt.sentenceCorrection ?? []) {
        list.push({
          key: `t2-${sentence.number}`,
          task: 2,
          prompt: `${sentence.number}. ${sentence.sentence}`,
          correct: sentence.isCorrect
            ? "Correcta"
            : sentence.correctedVersion ?? "",
          answers: groups.map((group) => {
            const row = group.task2.find(
              (item) => item.sentenceNumber === sentence.number
            );
            if (!row) return { group: group.label, text: "" };
            if (row.isCorrect) return { group: group.label, text: "Correcta" };
            return { group: group.label, text: row.correctedText ?? "" };
          }),
        });
      }
    }

    for (const sentence of prompt.translationSentences) {
      list.push({
        key: `t3-${sentence.number}`,
        task: 3,
        prompt: `${sentence.number}. ${sentence.spanish}`,
        correct: [
          ...sentence.acceptedEnglish,
          ...sentence.acceptableVariations,
        ].join(" / "),
        answers: groups.map((group) => ({
          group: group.label,
          text:
            group.task3.find((row) => row.sentenceNumber === sentence.number)
              ?.englishTranslation ?? "",
        })),
      });
    }
    return list;
  }, [prompt, groups]);

  const [index, setIndex] = useState(0);
  const item = items[index];
  if (!item) {
    return (
      <p className="text-sm text-gray-500">
        Este examen todavía no tiene preguntas para revisar.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Tarea {item.task} · {index + 1} de {items.length}
      </p>
      <p className="text-base font-medium text-gray-900">{item.prompt}</p>
      <p className="rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-800">
        Respuesta: {item.correct}
      </p>
      <ul className="space-y-2">
        {item.answers.map((answer) => (
          <li
            key={answer.group}
            className="rounded-lg border border-gray-100 px-3 py-2"
          >
            <p className="text-xs font-medium text-gray-500">{answer.group}</p>
            <p className="mt-0.5 text-sm text-gray-800">
              {answer.text.trim() || "(vacío)"}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          className="h-11 flex-1 rounded-lg border border-gray-200 text-sm font-medium text-gray-800 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={index >= items.length - 1}
          onClick={() =>
            setIndex((value) => Math.min(items.length - 1, value + 1))
          }
          className="h-11 flex-1 rounded-lg bg-gray-900 text-sm font-medium text-white disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
