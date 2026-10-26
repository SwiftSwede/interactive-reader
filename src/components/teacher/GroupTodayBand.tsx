"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import CountdownText from "@/components/dashboard/CountdownText";
import { TEACHER_APP_LABEL, ZOOM_LABEL } from "@/components/dashboard/JoinCard";
import { getClassDayPhase, type ClassDayPhase } from "@/lib/session-phase";
import {
  TEACHER_BUTTON_PRIMARY,
  TEACHER_BUTTON_SECONDARY,
} from "./teacher-ui";

export type GroupToday = {
  sessionId: string;
  sessionStartTime: string;
  sessionEndTime: string;
  classEndedAt: string | null;
  typeLabel: string;
  title: string;
  appHref: string | null;
  zoomHref: string | null;
  classHref: string;
  recordingMissing: boolean;
  initialPhase: ClassDayPhase;
};

function headline(phase: ClassDayPhase, now: number | null, startMs: number) {
  if (phase === "done-pending") return <>Clase terminada</>;
  if (now == null) return <>Hoy</>;
  if (now >= startMs) return <>En clase ahora</>;
  return (
    <>
      Empieza en <CountdownText ms={startMs - now} />
    </>
  );
}

export default function GroupTodayBand({
  today,
  standalone = false,
  groupName,
}: {
  today: GroupToday;
  standalone?: boolean;
  groupName?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const startMs = new Date(today.sessionStartTime).getTime();
  const phase =
    now == null
      ? today.initialPhase
      : getClassDayPhase(
          {
            sessionStartTime: today.sessionStartTime,
            sessionEndTime: today.sessionEndTime,
            classEndedAt: today.classEndedAt,
          },
          new Date(now)
        );
  const done = phase === "done-pending";
  const lesson =
    today.title === today.typeLabel
      ? today.typeLabel
      : `${today.typeLabel}: ${today.title}`;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-4 bg-accent-softer px-5 py-4 ${
        standalone
          ? "rounded-sheet border border-paper-line"
          : "border-b border-paper-line"
      }`}
    >
      <div className="min-w-0">
        <p className="text-label-md text-text-secondary">
          Hoy · {groupName ? `${groupName} · ` : ""}
          {lesson}
        </p>
        <p className="mt-1 flex items-center gap-2 text-headline-md text-text-primary">
          {done ? (
            <Check className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          ) : null}
          <span>{headline(phase, now, startMs)}</span>
        </p>
        {done && today.recordingMissing ? (
          <Link
            href={today.classHref}
            className="mt-1 inline-flex min-h-11 items-center text-label-md text-text-accent underline-offset-4 hover:underline"
          >
            Falta la grabación. Pégala aquí.
          </Link>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {today.appHref ? (
          <a
            href={today.appHref}
            className={done ? TEACHER_BUTTON_SECONDARY : TEACHER_BUTTON_PRIMARY}
          >
            {TEACHER_APP_LABEL}
          </a>
        ) : null}
        {today.zoomHref && !done ? (
          <a
            href={today.zoomHref}
            target="_blank"
            rel="noreferrer"
            className={
              today.appHref ? TEACHER_BUTTON_SECONDARY : TEACHER_BUTTON_PRIMARY
            }
          >
            {ZOOM_LABEL}
          </a>
        ) : null}
        {!today.zoomHref && !done ? (
          <Link
            href={today.classHref}
            className="inline-flex min-h-11 items-center text-label-md text-text-accent underline-offset-4 hover:underline"
          >
            Falta el link de Zoom
          </Link>
        ) : null}
      </div>
    </div>
  );
}
