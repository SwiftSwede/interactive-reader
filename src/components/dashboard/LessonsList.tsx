"use client";

import { useMemo, useState } from "react";
import LessonCard from "@/components/dashboard/LessonCard";
import { courseMonthHeading, type DashboardLesson } from "@/lib/dashboard";

type FilterId =
  | "todos"
  | "story"
  | "writing"
  | "exam"
  | "video_summary"
  | "presentation";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "story", label: "Historias" },
  { id: "writing", label: "Escritura" },
  { id: "exam", label: "Exámenes" },
  { id: "video_summary", label: "Traducción" },
  { id: "presentation", label: "Presentación" },
];

const PAGE_SIZE = 12;

export default function LessonsList({
  groups,
  showHeadings,
}: {
  groups: { displayName: string; lessons: DashboardLesson[] }[];
  showHeadings: boolean;
}) {
  const [filter, setFilter] = useState<FilterId>("todos");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          lessons: group.lessons.filter((lesson) =>
            filter === "todos" ? true : lesson.sessionType === filter
          ),
        }))
        .filter((group) => group.lessons.length > 0),
    [filter, groups]
  );

  const flat = filteredGroups.flatMap((group) =>
    group.lessons.map((lesson) => ({
      groupName: group.displayName,
      lesson,
    }))
  );
  const shown = flat.slice(0, visible);
  const hasMore = flat.length > visible;

  if (flat.length === 0) {
    return (
      <p className="mt-8 text-center text-body-main text-text-secondary">
        No hay clases de ese tipo todavía.
      </p>
    );
  }

  let lastHeading = "";

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setFilter(chip.id);
                setVisible(PAGE_SIZE);
              }}
              className={`h-11 min-w-11 rounded-full px-3 text-label-sm ${
                active
                  ? "bg-accent text-white"
                  : "border border-paper-line text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {shown.map((row) => {
          const heading = courseMonthHeading(
            row.lesson.sessionDate,
            row.groupName
          );
          const showHeading = showHeadings && heading !== lastHeading;
          lastHeading = heading;
          return (
            <li key={row.lesson.sessionId}>
              {showHeading ? (
                <p className="mb-2 mt-4 text-label-sm uppercase text-text-muted first:mt-0">
                  {heading}
                </p>
              ) : null}
              <LessonCard
                sessionType={row.lesson.sessionType}
                title={row.lesson.title}
                lifecycle={row.lesson.lifecycle}
                completed={row.lesson.completed}
                hasRecording={row.lesson.hasRecording}
                recordingYoutubeUrl={row.lesson.recordingYoutubeUrl}
                sessionDate={row.lesson.sessionDate}
                href={row.lesson.href}
                liveOnly={row.lesson.liveOnly}
              />
            </li>
          );
        })}
      </ul>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setVisible((count) => count + PAGE_SIZE)}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-card border border-paper-line text-label-md text-text-primary hover:bg-surface-hover"
        >
          Cargar más
        </button>
      ) : null}
    </>
  );
}
