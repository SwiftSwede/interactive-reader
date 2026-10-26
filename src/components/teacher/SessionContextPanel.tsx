"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import CopySessionLink from "@/app/teacher/classes/[id]/CopySessionLink";
import DeleteSessionButton from "@/app/teacher/classes/[id]/DeleteSessionButton";
import UnlockAnswersButton from "@/app/teacher/classes/[id]/UnlockAnswersButton";
import LocalDateTime from "@/components/LocalDateTime";
import AttendanceToggle from "./AttendanceToggle";
import SessionRecordingForm from "./SessionRecordingForm";
import { isAutoMarked } from "@/lib/attendance";
import type { AttendanceMark } from "@/lib/teacher";
import { TEACHER_BUTTON_SECONDARY } from "./teacher-ui";

export default function SessionContextPanel({
  courseId,
  sessionId,
  title,
  typeLabel,
  start,
  end,
  classEndedAt = null,
  recordingYoutubeUrl,
  liveOnly,
  students,
  notes,
  studentHref,
  answers,
  contentAction,
}: {
  courseId: string;
  sessionId: string;
  title: string;
  typeLabel: string;
  start: string;
  end: string;
  classEndedAt?: string | null;
  recordingYoutubeUrl: string | null;
  liveOnly: boolean;
  students: AttendanceMark[];
  notes: string | null;
  studentHref: string | null;
  answers: "locked" | "unlocked" | null;
  contentAction?: ReactNode;
}) {
  const attended = students.filter((student) => student.attended).length;

  return (
    <div>
      <p className="text-label-sm text-text-muted">{typeLabel}</p>
      <h2 className="mt-1 text-headline-md text-text-primary">{title}</h2>
      <div className="mt-2 text-label-sm text-text-muted">
        <LocalDateTime iso={start} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/teacher/classes/${courseId}/sessions/${sessionId}`}
          className={TEACHER_BUTTON_SECONDARY}
        >
          Abrir la clase
        </Link>
        {studentHref ? <CopySessionLink href={studentHref} compact /> : null}
      </div>

      {notes ? (
        <p className="mt-4 text-label-sm text-text-secondary">{notes}</p>
      ) : null}

      {contentAction ? <div className="mt-4 w-fit">{contentAction}</div> : null}

      <div className="mt-6">
        <SessionRecordingForm
          courseId={courseId}
          sessionId={sessionId}
          recordingUrl={recordingYoutubeUrl}
        />
      </div>

      {answers ? (
        <div className="mt-6">
          <h3 className="text-label-md text-text-secondary">Respuestas</h3>
          {answers === "unlocked" ? (
            <p className="mt-2 text-label-sm text-text-muted">
              Respuestas desbloqueadas.
            </p>
          ) : (
            <div className="mt-2 w-fit">
              <UnlockAnswersButton courseId={courseId} sessionId={sessionId} />
            </div>
          )}
        </div>
      ) : null}

      <h3 className="mt-8 text-label-md text-text-secondary">
        Asistencia
        {students.length > 0 ? (
          <span className="ml-2 font-normal text-text-muted">
            {attended} de {students.length}
          </span>
        ) : null}
      </h3>
      {students.length === 0 ? (
        <p className="mt-3 text-body-main text-text-muted">
          Todavía no hay estudiantes en este grupo.
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {students.map((student) => (
            <li key={student.studentId}>
              <AttendanceToggle
                courseId={courseId}
                sessionId={sessionId}
                studentId={student.studentId}
                attended={student.attended}
                autoMarked={
                  !liveOnly &&
                  isAutoMarked(student.firstOpenedAt, start, end, classEndedAt)
                }
                name={student.displayName}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 border-t border-paper-line pt-4">
        <DeleteSessionButton courseId={courseId} sessionId={sessionId} />
      </div>
    </div>
  );
}
