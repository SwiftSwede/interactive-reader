"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import LocalDateTime from "@/components/LocalDateTime";
import ClassDayCard from "@/components/dashboard/ClassDayCard";
import { TEACHER_APP_LABEL } from "@/components/dashboard/JoinCard";
import { getClassDayPhase } from "@/lib/session-phase";
import DayTimePattern from "./DayTimePattern";
import { useTeacherPanel } from "./TeacherPanelContext";

export type ThisMonthGroup = {
  id: string;
  name: string;
  levelLabel: string;
  studentLabel: string;
  sessionStarts: string[];
  readiness: string;
  next: {
    kindLabel: string;
    title: string;
    start: string;
    typeLabel: string;
    ready: boolean;
  } | null;
  today: {
    sessionStartTime: string;
    sessionEndTime: string;
    classEndedAt: string | null;
    sessionDate: string;
    typeLabel: string;
    liveOnly: boolean;
    appHref: string | null;
    zoomHref: string | null;
  } | null;
};

function NextClassPanel({ group }: { group: ThisMonthGroup }) {
  return (
    <div>
      <p className="text-label-sm text-text-muted">{group.name}</p>
      <h2 className="mt-1 text-headline-md text-text-primary">
        {group.next ? `${group.next.kindLabel} clase` : "Próxima clase"}
      </h2>
      {group.today ? (
        <ClassDayCard
          sessionStartTime={group.today.sessionStartTime}
          sessionEndTime={group.today.sessionEndTime}
          classEndedAt={group.today.classEndedAt}
          sessionDate={group.today.sessionDate}
          href={group.today.appHref}
          zoomHref={group.today.zoomHref}
          appLabel={TEACHER_APP_LABEL}
          typeLabel={group.today.typeLabel}
          courseName={group.name}
          liveOnly={group.today.liveOnly}
          initialPhase={getClassDayPhase({
            sessionStartTime: group.today.sessionStartTime,
            sessionEndTime: group.today.sessionEndTime,
            classEndedAt: group.today.classEndedAt,
          })}
          className="mt-4"
        />
      ) : null}
      {group.next ? (
        <>
          <p className="mt-4 text-label-md text-text-secondary">
            {group.next.typeLabel}
          </p>
          <p className="mt-1 text-body-main text-text-primary">
            {group.next.title}
          </p>
          <div className="mt-2 text-label-sm text-text-muted">
            <LocalDateTime iso={group.next.start} />
          </div>
          <p className="mt-4 text-label-sm text-text-muted">
            {group.next.ready ? "Contenido listo" : "Sin contenido"}
          </p>
        </>
      ) : (
        <p className="mt-4 text-body-main text-text-secondary">
          Todavía no hay clase este mes.
        </p>
      )}
    </div>
  );
}

export default function ThisMonthBoard({
  groups,
}: {
  groups: ThisMonthGroup[];
}) {
  const { setPanel } = useTeacherPanel();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = groups.find((group) => group.id === selectedId) ?? null;

  useEffect(() => {
    setPanel(selected ? <NextClassPanel group={selected} /> : null);
    return () => setPanel(null);
  }, [selected, setPanel]);

  return (
    <ul className="mt-6 space-y-4">
      {groups.map((group) => {
        const active = group.id === selectedId;
        return (
          <li key={group.id}>
            <article
              className={`relative overflow-hidden rounded-sheet border border-paper-line bg-surface ${
                active ? "bg-surface-hover" : ""
              }`}
            >
              {active ? (
                <span
                  className="absolute top-0 bottom-0 left-0 w-[3px] bg-accent"
                  aria-hidden="true"
                />
              ) : null}
              <button
                type="button"
                onClick={() =>
                  setSelectedId((current) =>
                    current === group.id ? null : group.id
                  )
                }
                className="w-full px-5 py-5 pr-16 text-left hover:bg-surface-hover active:bg-surface-hover"
              >
                <p className="text-headline-md text-text-primary">
                  {group.name}
                </p>
                <p className="mt-1 text-label-md text-text-secondary">
                  {group.levelLabel}
                  {group.sessionStarts.length > 0 ? (
                    <>
                      {" · "}
                      <DayTimePattern starts={group.sessionStarts} />
                    </>
                  ) : null}
                </p>
                <p className="mt-1 text-label-sm text-text-muted">
                  {group.studentLabel} · {group.readiness}
                </p>
                {group.next ? (
                  <div className="mt-3 text-label-sm text-text-secondary">
                    <p>
                      {`${group.next.kindLabel}: ${group.next.title}`}
                    </p>
                    <LocalDateTime iso={group.next.start} />
                  </div>
                ) : (
                  <p className="mt-3 text-label-sm text-text-muted">
                    Todavía no hay clase este mes.
                  </p>
                )}
              </button>
              <Link
                href={`/teacher/classes/${group.id}`}
                aria-label={`Abrir ${group.name}`}
                className="absolute top-1/2 right-3 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-card text-text-muted hover:bg-accent-soft hover:text-text-accent"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
