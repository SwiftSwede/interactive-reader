"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, CircleDashed } from "lucide-react";
import LocalDateTime from "@/components/LocalDateTime";
import DayTimePattern from "./DayTimePattern";
import GroupTodayBand, { type GroupToday } from "./GroupTodayBand";
import { TEACHER_CONTEXT_PANEL_ID } from "./ContextPanel";
import { useTeacherPanel } from "./TeacherPanelContext";
import { TEACHER_BUTTON_SECONDARY, TEACHER_ICON_BUTTON } from "./teacher-ui";

export type MonthClass = {
  id: string;
  number: number;
  typeLabel: string;
  title: string;
  start: string;
  ready: boolean;
  pending: boolean;
  href: string;
  isToday: boolean;
};

export type ThisMonthGroup = {
  id: string;
  href: string;
  name: string;
  theme: string | null;
  levelLabel: string;
  studentLabel: string;
  sessionStarts: string[];
  zoomHref: string | null;
  classes: MonthClass[];
  next: {
    sessionId: string;
    kindLabel: string;
    typeLabel: string;
    title: string;
    start: string;
  } | null;
  today: GroupToday | null;
};

function lessonLabel(typeLabel: string, title: string): string {
  return title === typeLabel ? typeLabel : `${typeLabel}: ${title}`;
}

function missingLabel(item: MonthClass): string {
  return `Clase ${item.number} · ${item.pending ? "Por elegir" : item.typeLabel}`;
}

function Readiness({ group }: { group: ThisMonthGroup }) {
  const missing = group.classes.filter((item) => !item.ready);
  if (group.classes.length === 0) {
    return (
      <p className="text-label-md text-text-secondary">
        Todavía no hay clases este mes.
      </p>
    );
  }
  if (missing.length === 0) {
    return (
      <p className="flex items-center gap-2 text-label-md text-text-secondary">
        <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        Las {group.classes.length} clases tienen contenido.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="flex items-center gap-2 text-label-md text-text-primary">
        <CircleDashed
          className="h-4 w-4 shrink-0 text-text-accent"
          aria-hidden="true"
        />
        Falta contenido:
      </p>
      <ul className="flex flex-wrap gap-x-3">
        {missing.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="inline-flex min-h-11 items-center text-label-md text-text-accent underline-offset-4 hover:underline"
            >
              {missingLabel(item)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthPanel({ group }: { group: ThisMonthGroup }) {
  return (
    <div className="flex flex-col">
      <h2 className="text-headline-md text-text-primary">{group.name}</h2>
      <p className="mt-1 text-label-md text-text-secondary">
        {group.levelLabel} · {group.studentLabel}
      </p>
      {group.zoomHref ? (
        <a
          href={group.zoomHref}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-11 items-center self-start text-label-md text-text-accent underline-offset-4 hover:underline"
        >
          Entrar a Zoom
        </a>
      ) : null}

      <h3 className="mt-6 text-label-md text-text-secondary">Las clases</h3>
      <ol className="mt-2 divide-y divide-paper-line overflow-hidden rounded-card border border-paper-line">
        {group.classes.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-surface-hover ${
                item.isToday ? "bg-accent-softer" : ""
              }`}
            >
              <span className="w-5 shrink-0 text-right text-label-sm tabular-nums text-text-muted">
                {item.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label-md text-text-primary">
                  {item.typeLabel}
                  {item.isToday ? (
                    <span className="text-text-accent"> · Hoy</span>
                  ) : null}
                </span>
                <span className="block truncate text-label-sm text-text-secondary">
                  {item.title === item.typeLabel ? (
                    <LocalDateTime
                      iso={item.start}
                      format="day"
                      className="text-label-sm text-text-secondary"
                    />
                  ) : (
                    <>
                      {item.title} ·{" "}
                      <LocalDateTime
                        iso={item.start}
                        format="day"
                        className="text-label-sm text-text-secondary"
                      />
                    </>
                  )}
                </span>
              </span>
              {item.ready ? (
                <Check
                  className="h-4 w-4 shrink-0 text-success"
                  aria-label="Contenido listo"
                />
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-label-sm text-text-accent">
                  <CircleDashed className="h-4 w-4" aria-hidden="true" />
                  {item.pending ? "Por elegir" : "Falta"}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>

      <Link href={group.href} className={`${TEACHER_BUTTON_SECONDARY} mt-6`}>
        Abrir grupo
      </Link>
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
    setPanel(selected ? <MonthPanel group={selected} /> : null, () =>
      setSelectedId(null)
    );
    return () => setPanel(null);
  }, [selected, setPanel]);

  return (
    <ul className="mt-8 space-y-4">
      {groups.map((group) => {
        const active = group.id === selectedId;
        const showNext =
          group.next != null &&
          group.next.sessionId !== group.today?.sessionId;
        return (
          <li key={group.id}>
            <article
              className={`overflow-hidden rounded-sheet border bg-surface ${
                active ? "border-accent" : "border-paper-line"
              }`}
            >
              {group.today ? <GroupTodayBand today={group.today} /> : null}
              <div
                className={`relative ${active ? "bg-surface-hover" : ""}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedId((current) =>
                      current === group.id ? null : group.id
                    )
                  }
                  aria-expanded={active}
                  aria-controls={active ? TEACHER_CONTEXT_PANEL_ID : undefined}
                  aria-label={`${group.name}: ver las clases del mes`}
                  aria-describedby={`${group.id}-meta`}
                  className="w-full px-5 pt-5 pb-4 pr-16 text-left hover:bg-surface-hover"
                >
                  <span className="block text-headline-md text-text-primary">
                    {group.name}
                  </span>
                  <span
                    id={`${group.id}-meta`}
                    className="mt-1 block text-label-md text-text-secondary"
                  >
                    {[group.theme, group.levelLabel].filter(Boolean).join(" · ")}
                    {group.sessionStarts.length > 0 ? (
                      <>
                        {" · "}
                        <DayTimePattern starts={group.sessionStarts} />
                      </>
                    ) : null}
                    {" · "}
                    {group.studentLabel}
                  </span>
                  {showNext && group.next ? (
                    <span className="mt-3 block text-label-md text-text-primary">
                      {group.next.kindLabel}:{" "}
                      {lessonLabel(group.next.typeLabel, group.next.title)}
                      <span className="text-text-secondary">
                        {" · "}
                        <LocalDateTime
                          iso={group.next.start}
                          className="text-label-md text-text-secondary"
                        />
                      </span>
                    </span>
                  ) : null}
                </button>
                <Link
                  href={group.href}
                  aria-label={`Abrir ${group.name}`}
                  className={`${TEACHER_ICON_BUTTON} absolute top-4 right-3`}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
              <div className="border-t border-paper-line px-5 py-2">
                <Readiness group={group} />
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
