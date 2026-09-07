"use client";

import { useEffect, useState } from "react";
import { formatDayTimePattern } from "@/lib/teacher-month";

export default function DayTimePattern({ starts }: { starts: string[] }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(formatDayTimePattern(starts));
  }, [starts.join("|")]);

  if (!label) return null;
  return <span>{label}</span>;
}
