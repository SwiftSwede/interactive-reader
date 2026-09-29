"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import { saveTeacherObservation } from "@/app/teacher/save-observation-action";
import type { TagType } from "@/types";

export type ObservationChoice = {
  tagType: "error" | "phonetic" | "grammar";
  group: string;
  name: string;
  displayName: string;
};

export type ObservationFlag = {
  tagType: TagType;
  tagName: string;
  displayName: string;
};

type Chip = {
  key: string;
  tagType: TagType;
  tagName: string;
  label: string;
  noteOnly: boolean;
  source: "existing" | "added";
};

function findChoice(
  raw: string,
  choices: ObservationChoice[]
): ObservationChoice | null {
  const needle = raw.trim();
  if (!needle) return null;
  const lower = needle.toLocaleLowerCase("es");
  return (
    choices.find((choice) => choice.name === needle) ??
    choices.find((choice) => choice.displayName === needle) ??
    choices.find((choice) => choice.name.toLocaleLowerCase("es") === lower) ??
    choices.find(
      (choice) => choice.displayName.toLocaleLowerCase("es") === lower
    ) ??
    null
  );
}

export default function ObservationTagForm({
  studentId,
  sessionId = null,
  vocabulary,
  existingFlags,
  onSaved,
}: {
  studentId: string;
  sessionId?: string | null;
  vocabulary: ObservationChoice[];
  existingFlags: ObservationFlag[];
  onSaved?: () => void;
}) {
  const router = useRouter();
  const listId = `observation-tags-${studentId}`;
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [chips, setChips] = useState<Chip[]>(() =>
    existingFlags.map((flag) => ({
      key: `${flag.tagType}:${flag.tagName}`,
      tagType: flag.tagType,
      tagName: flag.tagName,
      label: flag.displayName,
      noteOnly: false,
      source: "existing",
    }))
  );
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = useState("");

  function addChip() {
    const raw = draft.trim();
    if (!raw) return;
    setError("");
    setPhase("idle");

    const choice = findChoice(raw, vocabulary);
    if (choice) {
      const key = `${choice.tagType}:${choice.name}`;
      setRemovedKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      setChips((current) => {
        if (current.some((chip) => chip.key === key)) return current;
        const existed = existingFlags.some(
          (flag) => flag.tagType === choice.tagType && flag.tagName === choice.name
        );
        return [
          ...current,
          {
            key,
            tagType: choice.tagType,
            tagName: choice.name,
            label: choice.displayName,
            noteOnly: false,
            source: existed ? "existing" : "added",
          },
        ];
      });
    } else {
      const key = `note:${raw.toLocaleLowerCase("es")}`;
      setChips((current) => {
        if (current.some((chip) => chip.key === key)) return current;
        return [
          ...current,
          {
            key,
            tagType: "error",
            tagName: raw,
            label: raw,
            noteOnly: true,
            source: "added",
          },
        ];
      });
    }
    setDraft("");
  }

  function removeChip(chip: Chip) {
    setError("");
    setPhase("idle");
    setChips((current) => current.filter((item) => item.key !== chip.key));
    if (chip.source === "existing" && !chip.noteOnly) {
      setRemovedKeys((current) => new Set(current).add(chip.key));
    }
  }

  async function save() {
    const noteOnly = chips.filter((chip) => chip.noteOnly);
    const trimmedNote = note.trim();
    if (noteOnly.length > 0 && trimmedNote.length === 0) {
      setError("Escribe una nota para el término que no está en la lista.");
      return;
    }

    const observations = [
      ...chips
        .filter((chip) => chip.source === "added" && !chip.noteOnly)
        .map((chip) => ({
          tagType: chip.tagType,
          tagName: chip.tagName,
          action: "flag" as const,
        })),
      ...existingFlags
        .filter((flag) => removedKeys.has(`${flag.tagType}:${flag.tagName}`))
        .map((flag) => ({
          tagType: flag.tagType,
          tagName: flag.tagName,
          action: "clear" as const,
        })),
      ...noteOnly.map((chip) => ({
        tagType: "error" as const,
        tagName: chip.tagName,
        action: "flag" as const,
      })),
    ];

    if (observations.length === 0 && trimmedNote.length === 0) {
      setError("No hay nada que guardar.");
      return;
    }

    setPhase("pending");
    setError("");
    const result = await saveTeacherObservation({
      studentId,
      sessionId,
      observations,
      note: trimmedNote,
    });
    if (!result.ok) {
      setPhase("idle");
      setError(result.error);
      return;
    }

    setChips((current) =>
      current
        .filter((chip) => !chip.noteOnly)
        .map((chip) => ({ ...chip, source: "existing" as const }))
    );
    setRemovedKeys(new Set());
    setNote("");
    setPhase("success");
    router.refresh();
    onSaved?.();
  }

  return (
    <div className="mt-3">
      <label className="block" htmlFor={`${listId}-input`}>
        <span className="mb-1.5 block text-label-md text-text-secondary">
          Etiqueta
        </span>
        <div className="flex gap-2">
          <input
            id={`${listId}-input`}
            list={listId}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (phase === "success") setPhase("idle");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addChip();
              }
            }}
            placeholder="Escribe o elige"
            className="min-h-11 min-w-0 flex-1 rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none"
          />
          <ActionButton variant="secondary" className="shrink-0" onClick={addChip}>
            Marcar
          </ActionButton>
        </div>
      </label>
      <datalist id={listId}>
        {vocabulary.map((choice) => (
          <option
            key={`${choice.tagType}:${choice.name}:label`}
            value={choice.displayName}
          >
            {choice.group}
          </option>
        ))}
        {vocabulary.map((choice) => (
          <option
            key={`${choice.tagType}:${choice.name}:name`}
            value={choice.name}
          >
            {choice.displayName}
          </option>
        ))}
      </datalist>

      {chips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <span className="inline-flex items-center rounded-small border border-paper-line bg-surface-hover pl-2.5">
                <span className="text-sm text-text-primary">
                  {chip.label}
                  {chip.noteOnly ? (
                    <span className="ml-1 text-text-muted">solo nota</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => removeChip(chip)}
                  aria-label={`Quitar ${chip.label}`}
                  className="inline-flex h-11 w-11 items-center justify-center text-text-secondary hover:text-text-primary"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="mt-4 block" htmlFor={`${listId}-note`}>
        <span className="mb-1.5 block text-label-md text-text-secondary">
          Nota
        </span>
        <textarea
          id={`${listId}-note`}
          value={note}
          maxLength={1000}
          rows={3}
          onChange={(event) => {
            setNote(event.target.value);
            if (phase === "success") setPhase("idle");
          }}
          placeholder="Algo que quieras recordar de esta persona."
          className="w-full rounded-card border border-paper-line bg-surface px-3 py-3 text-body-main text-text-primary placeholder:text-text-muted focus:border-2 focus:border-accent focus:outline-none"
        />
      </label>

      <div className="mt-3">
        <ActionButton
          state={phase === "pending" ? "pending" : phase === "success" ? "success" : "idle"}
          pendingLabel="Guardando..."
          successLabel="Guardado"
          onClick={() => {
            void save();
          }}
        >
          Guardar
        </ActionButton>
      </div>
      {error ? <p className="mt-2 text-label-sm text-error">{error}</p> : null}
    </div>
  );
}
