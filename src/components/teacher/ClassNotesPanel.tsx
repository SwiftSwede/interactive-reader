"use client";

import { useState } from "react";
import ObservationTagForm, {
  type ObservationChoice,
  type ObservationFlag,
} from "@/components/teacher/ObservationTagForm";
import type { TagType } from "@/types";

export type ClassNoteStudent = {
  id: string;
  name: string;
  email: string | null;
};

export type ClassNoteFlag = ObservationFlag & {
  studentId: string;
  tagType: TagType;
};

export default function ClassNotesPanel({
  sessionId,
  students,
  vocabulary,
  flags,
}: {
  sessionId: string;
  students: ClassNoteStudent[];
  vocabulary: ObservationChoice[];
  flags: ClassNoteFlag[];
}) {
  const [dismissed, setDismissed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  if (dismissed) return null;

  const flagsFor = (studentId: string): ObservationFlag[] =>
    flags
      .filter((flag) => flag.studentId === studentId)
      .map((flag) => ({
        tagType: flag.tagType,
        tagName: flag.tagName,
        displayName: flag.displayName,
      }));

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-headline-md text-text-primary">Notas de clase</h2>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex min-h-11 items-center justify-center rounded-card border border-paper-line px-4 text-label-md text-text-secondary hover:bg-surface-hover"
        >
          Saltar
        </button>
      </div>

      {students.length === 0 ? (
        <p className="mt-4 text-body-main text-text-muted">
          Todavía no hay estudiantes en esta clase.
        </p>
      ) : (
        <ul className="mt-4 overflow-hidden divide-y divide-paper-line rounded-sheet border border-paper-line bg-surface">
          {students.map((student) => {
            const open = openId === student.id;
            return (
              <li key={student.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : student.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-surface-hover"
                >
                  <span>
                    <span className="block text-label-md text-text-primary">
                      {student.name}
                    </span>
                    {student.email ? (
                      <span className="mt-0.5 block text-label-sm text-text-muted">
                        {student.email}
                      </span>
                    ) : null}
                  </span>
                  {savedIds.has(student.id) ? (
                    <span className="text-label-sm text-text-muted">Guardado</span>
                  ) : null}
                </button>
                {open ? (
                  <div className="px-3 pb-3">
                    <ObservationTagForm
                      studentId={student.id}
                      sessionId={sessionId}
                      vocabulary={vocabulary}
                      existingFlags={flagsFor(student.id)}
                      onSaved={() => {
                        setSavedIds((current) => new Set(current).add(student.id));
                        setOpenId(null);
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
