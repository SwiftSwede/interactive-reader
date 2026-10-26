import type { ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronRight, CircleDashed } from "lucide-react";
import CopySessionLink from "@/app/teacher/classes/[id]/CopySessionLink";
import LocalDateTime from "@/components/LocalDateTime";
import { studentSessionPath, type SessionType } from "@/lib/activities";
import { TEACHER_ICON_BUTTON } from "./teacher-ui";

function RowStatus({
  ok,
  okLabel,
  missingLabel,
}: {
  ok: boolean;
  okLabel: string;
  missingLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {ok ? (
        <Check className="h-4 w-4 text-success" aria-hidden="true" />
      ) : (
        <CircleDashed className="h-4 w-4 text-text-accent" aria-hidden="true" />
      )}
      <span className={ok ? "text-text-secondary" : "text-text-accent"}>
        {ok ? okLabel : missingLabel}
      </span>
    </span>
  );
}

export default function TeacherSessionRow({
  courseId,
  classNumber,
  sessionId,
  sessionType,
  title,
  typeLabel,
  start,
  token,
  storySlug,
  contentStatus,
  hasRecording,
  attendedCount,
  rosterCount,
  isToday,
  started,
  ended,
  selected,
  onSelect,
  contentAction,
}: {
  courseId: string;
  classNumber: number;
  sessionId: string;
  sessionType: SessionType;
  title: string;
  typeLabel: string;
  start: string;
  token: string;
  storySlug: string | null;
  contentStatus: string;
  hasRecording: boolean;
  attendedCount: number;
  rosterCount: number;
  isToday: boolean;
  started: boolean;
  ended: boolean;
  selected: boolean;
  onSelect: () => void;
  contentAction?: ReactNode;
}) {
  const studentHref = studentSessionPath({
    sessionType,
    token,
    storySlug,
  });

  return (
    <li
      className={`first:rounded-t-sheet last:rounded-b-sheet ${
        isToday ? "bg-accent-softer" : ""
      } ${selected ? "ring-1 ring-inset ring-accent" : ""}`}
    >
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block text-label-sm text-text-muted">
            {isToday ? "Hoy · " : ""}Clase {classNumber} · {typeLabel} ·{" "}
            <LocalDateTime iso={start} format="dayTime" className="" />
          </span>
          <span className="mt-1 block text-label-md text-text-primary">
            {title}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-label-sm">
            <RowStatus
              ok={contentStatus === "Contenido listo"}
              okLabel="Contenido listo"
              missingLabel={contentStatus}
            />
            {ended ? (
              <RowStatus
                ok={hasRecording}
                okLabel="Grabación"
                missingLabel="Falta la grabación"
              />
            ) : null}
            {started ? (
              <span className="text-text-secondary">
                Asistieron {attendedCount} de {rosterCount}
              </span>
            ) : null}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {contentAction ? <div>{contentAction}</div> : null}
          {studentHref ? <CopySessionLink href={studentHref} compact /> : null}
          <Link
            href={`/teacher/classes/${courseId}/sessions/${sessionId}`}
            aria-label={`Abrir ${title}`}
            className={TEACHER_ICON_BUTTON}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </li>
  );
}
