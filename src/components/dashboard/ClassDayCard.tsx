"use client";

import { useEffect, useState } from "react";
import { formatCountdownLabel, isLocalCalendarDate } from "@/lib/dashboard";
import {
  getClassDayPhase,
  getSessionJoinTime,
  type ClassDayPhase,
} from "@/lib/session-phase";

export default function ClassDayCard({
  sessionStartTime,
  sessionEndTime,
  sessionDate,
  href,
  typeLabel,
  courseName,
  liveOnly,
  initialPhase,
}: {
  sessionStartTime: string;
  sessionEndTime: string;
  sessionDate: string;
  href: string | null;
  typeLabel: string;
  courseName: string;
  liveOnly: boolean;
  initialPhase: ClassDayPhase;
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

  const joinTime = getSessionJoinTime({ sessionStartTime }).getTime();
  const remaining = Math.max(0, joinTime - (now ?? Date.now()));

  if (phase === "done-pending") {
    return (
      <section className="mt-6 rounded-card bg-success-bg px-4 py-3">
        <p className="text-label-md text-success">
          ✓ Clase terminada · La grabación se subirá a YouTube pronto
        </p>
      </section>
    );
  }

  if (phase === "join") {
    if (liveOnly) {
      return (
        <section className="mt-6 rounded-card border border-paper-line bg-surface px-4 py-4">
          <p className="text-headline-md text-text-primary">
            {typeLabel} · Entra por Zoom
          </p>
          <p className="mt-1 text-body-main text-text-secondary">
            El link está en el chat de Zoom.
          </p>
        </section>
      );
    }

    return (
      <section className="mt-6 rounded-card bg-accent px-4 py-5">
        {href ? (
          <a
            href={href}
            className="flex min-h-12 items-center justify-center rounded-card bg-white px-4 text-center text-label-md font-semibold text-accent hover:bg-accent-softer"
          >
            ENTRAR A LA CLASE ▶
          </a>
        ) : (
          <p className="text-center text-label-md font-semibold text-white">
            ENTRAR A LA CLASE
          </p>
        )}
        <p className="mt-3 text-center text-label-md text-white">
          {typeLabel} · {courseName}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-card border border-paper-line bg-surface px-4 py-4">
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
