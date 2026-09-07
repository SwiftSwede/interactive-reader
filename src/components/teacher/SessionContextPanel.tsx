"use client";

import LocalDateTime from "@/components/LocalDateTime";
import AttendanceToggle from "./AttendanceToggle";
import SessionRecordingForm from "./SessionRecordingForm";
import { isAutoMarked } from "@/lib/attendance";
import type { AttendanceMark } from "@/lib/teacher";

export default function SessionContextPanel({
  courseId,
  sessionId,
  title,
  typeLabel,
  start,
  end,
  recordingYoutubeUrl,
  liveOnly,
  students,
}: {
  courseId: string;
  sessionId: string;
  title: string;
  typeLabel: string;
  start: string;
  end: string;
  recordingYoutubeUrl: string | null;
  liveOnly: boolean;
  students: AttendanceMark[];
}) {
  return (
    <div>
      <p className="text-label-sm text-text-muted">{typeLabel}</p>
      <h2 className="mt-1 text-headline-md text-text-primary">{title}</h2>
      <div className="mt-2 text-label-sm text-text-muted">
        <LocalDateTime iso={start} />
      </div>

      <div className="mt-6">
        <SessionRecordingForm
          courseId={courseId}
          sessionId={sessionId}
          recordingUrl={recordingYoutubeUrl}
        />
      </div>

      <h3 className="mt-8 text-label-md text-text-secondary">Asistencia</h3>
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
                  isAutoMarked(student.firstOpenedAt, start, end)
                }
                name={student.displayName}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
