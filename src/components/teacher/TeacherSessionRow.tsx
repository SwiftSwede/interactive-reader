import Link from "next/link";
import { ChevronRight } from "lucide-react";
import CopySessionLink from "@/app/teacher/classes/[id]/CopySessionLink";
import DeleteSessionButton from "@/app/teacher/classes/[id]/DeleteSessionButton";
import UnlockAnswersButton from "@/app/teacher/classes/[id]/UnlockAnswersButton";
import LocalDateTime from "@/components/LocalDateTime";
import {
  isStoryBackedSessionType,
  studentSessionPath,
  type SessionType,
} from "@/lib/activities";

function attendanceLabel(names: string[]): string {
  if (names.length === 0) return "Nadie ha entrado todavía.";
  return `Asistieron: ${names.length}`;
}

export default function TeacherSessionRow({
  courseId,
  classNumber,
  sessionId,
  sessionType,
  title,
  typeLabel,
  start,
  notes,
  token,
  storySlug,
  contentStatus,
  recordingStatus,
  attendedNames,
  unlocked,
  selected,
  onSelect,
}: {
  courseId: string;
  classNumber: number;
  sessionId: string;
  sessionType: SessionType;
  title: string;
  typeLabel: string;
  start: string;
  notes: string | null;
  token: string;
  storySlug: string | null;
  contentStatus: string;
  recordingStatus: string;
  attendedNames: string[];
  unlocked: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const studentHref = studentSessionPath({
    sessionType,
    token,
    storySlug,
  });

  return (
    <li
      className={`relative px-4 py-4 ${
        selected ? "bg-surface-hover" : ""
      }`}
    >
      {selected ? (
        <span
          className="absolute top-0 bottom-0 left-0 w-[3px] bg-accent"
          aria-hidden="true"
        />
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        className="w-full pr-12 text-left"
      >
        <p className="text-label-sm text-text-muted">
          Clase {classNumber} · {typeLabel} · {contentStatus} · {recordingStatus}
        </p>
        <p className="mt-1 text-label-md text-text-primary">{title}</p>
        <LocalDateTime iso={start} />
      </button>
      <Link
        href={`/teacher/classes/${courseId}/sessions/${sessionId}`}
        aria-label={`Abrir ${title}`}
        className="absolute top-4 right-3 inline-flex h-11 w-11 items-center justify-center rounded-card text-text-muted hover:bg-accent-soft hover:text-text-accent"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </Link>
      {notes ? (
        <p className="mt-1 text-label-sm text-text-secondary">{notes}</p>
      ) : null}
      <p className="mt-1 text-label-sm text-text-secondary">
        {attendanceLabel(attendedNames)}
      </p>
      {attendedNames.length > 0 ? (
        <p className="mt-0.5 break-words text-label-sm text-text-muted">
          {attendedNames.join(", ")}
        </p>
      ) : null}
      {isStoryBackedSessionType(sessionType) ? (
        unlocked ? (
          <p className="mt-2 text-label-sm text-text-muted">
            Respuestas desbloqueadas.
          </p>
        ) : (
          <div className="mt-2">
            <UnlockAnswersButton courseId={courseId} sessionId={sessionId} />
          </div>
        )
      ) : null}
      <div className="mt-2 grid grid-cols-2 items-stretch gap-2">
        {studentHref ? <CopySessionLink href={studentHref} /> : <span />}
        <DeleteSessionButton courseId={courseId} sessionId={sessionId} />
      </div>
    </li>
  );
}
