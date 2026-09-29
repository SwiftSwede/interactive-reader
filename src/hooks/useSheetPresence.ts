"use client";

import { useEffect, useState } from "react";

const SHEET_MS = 200;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Keep a sheet mounted through its 200ms exit so close is not a hard cut. */
export function useSheetPresence(open: boolean): {
  present: boolean;
  exiting: boolean;
} {
  const [present, setPresent] = useState(open);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setPresent(true);
      setExiting(false);
      return;
    }
    if (!present) return;
    if (prefersReducedMotion()) {
      setPresent(false);
      setExiting(false);
      return;
    }
    setExiting(true);
    const id = window.setTimeout(() => {
      setPresent(false);
      setExiting(false);
    }, SHEET_MS);
    return () => window.clearTimeout(id);
  }, [open, present]);

  return { present, exiting };
}
