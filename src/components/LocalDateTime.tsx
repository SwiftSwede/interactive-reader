"use client";

import { useEffect, useState } from "react";

const FORMATS = {
  full: { dateStyle: "medium", timeStyle: "short" },
  day: { weekday: "short", month: "short", day: "numeric" },
  dayTime: {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export default function LocalDateTime({
  iso,
  className,
  format = "full",
}: {
  iso: string;
  className?: string;
  format?: keyof typeof FORMATS;
}) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    setLabel(date.toLocaleString(undefined, FORMATS[format]));
  }, [iso, format]);

  return (
    <time
      dateTime={iso}
      className={className ?? "mt-0.5 block text-label-sm text-text-muted"}
    >
      {label || "…"}
    </time>
  );
}
