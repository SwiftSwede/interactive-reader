"use client";

import { useEffect, useState } from "react";
import { formatCountdownLabel } from "@/lib/dashboard";
import {
  getClassDayPhase,
  type ClassDayPhase,
} from "@/lib/session-phase";
import JoinCard, { STUDENT_APP_LABEL } from "./JoinCard";

export default function ClassDayCard({
  sessionStartTime,
  sessionEndTime,
  classEndedAt = null,
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
  classEndedAt?: string | null;
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

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const clock = now ?? Date.now();
  const startMs = new Date(sessionStartTime).getTime();
  const remaining = Math.max(0, startMs - clock);

  const phase: ClassDayPhase =
    now == null
      ? initialPhase
      : getClassDayPhase(
          { sessionStartTime, sessionEndTime, classEndedAt },
          new Date(clock)
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
