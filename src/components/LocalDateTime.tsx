"use client";

import { useEffect, useState } from "react";

export default function LocalDateTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    setLabel(
      date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    );
  }, [iso]);

  return (
    <time dateTime={iso} className="mt-0.5 block text-sm text-gray-500">
      {label || "…"}
    </time>
  );
}
