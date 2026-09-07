"use client";

import { useEffect, useState } from "react";
import { formatCountdownLabel, isLocalCalendarDate } from "@/lib/dashboard";
import { getClassDayPhase, type ClassDayPhase } from "@/lib/session-phase";
import JoinCard, { STUDENT_APP_LABEL } from "./JoinCard";

export default function ClassDayCard({
  sessionStartTime,
  sessionEndTime,
  sessionDate,
  href,
  zoomHref,
  appLabel = STUDENT_APP_LABEL,
  typeLabel,
  courseName,
  liveOnly,
  initialPhase,
  className = "mt-6",
}: {
  sessionStartTime: string;
  sessionEndTime: string;
  sessionDate: string;
  href: string | null;
  zoomHref?: string | null;
  appLabel?: string;
  typeLabel: string;
  courseName: string;
  liveOnly: boolean;
  initialPhase: ClassDayPhase;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  const phase: ClassDayPhase =
    now == null
      ? initialPhase
      : getClassDayPhase({ sessionStartTime, sessionEndTime }, new Date(now));

  useEffect(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (now == null) return;
    if (phase === "done-pending") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [now, phase]);

  if (now != null && !isLocalCalendarDate(sessionDate, new Date(now))) {
    return null;
  }

  const remaining = Math.max(
    0,
    new Date(sessionStartTime).getTime() - (now ?? Date.now())
  );

  if (phase === "done-pending") {
    return (
      <section className={`rounded-card bg-success-bg px-4 py-3 ${className}`}>
        <p className="text-label-md text-success">
          ✓ Clase terminada · La grabación se subirá a YouTube pronto
        </p>
      </section>
    );
  }

  if (phase === "join") {
    return (
      <JoinCard
        appHref={liveOnly ? null : href}
        zoomHref={zoomHref ?? null}
        appLabel={appLabel}
        liveOnly={liveOnly}
        typeLabel={typeLabel}
        courseName={courseName}
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-card border border-paper-line bg-surface px-4 py-4 ${className}`}
    >
      <p className="text-label-md text-text-secondary">La clase es HOY</p>
      <p className="mt-1 text-headline-md tabular-nums text-text-primary">
        Empieza en {formatCountdownLabel(remaining)}
      </p>
      <p className="mt-1 text-label-md text-text-secondary">
        {typeLabel} · {courseName}
      </p>
    </section>
  );
}
