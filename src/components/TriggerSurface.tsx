"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { playFromTrigger } from "@/lib/trigger-origin";

/** Panel that scales from the control that was focused when it opened. */
export default function TriggerSurface({
  className,
  children,
  modal = true,
}: {
  className?: string;
  children: ReactNode;
  modal?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) playFromTrigger(ref.current, modal);
  }, [modal]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
