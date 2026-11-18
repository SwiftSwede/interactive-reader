"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { replayCenterPop } from "@/lib/trigger-origin";

/** Centered dialog panel. Scales from its own center, not from the button. */
export default function TriggerSurface({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) replayCenterPop(ref.current);
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
