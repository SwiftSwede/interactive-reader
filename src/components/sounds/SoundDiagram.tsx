"use client";

import { useEffect, useRef, useState } from "react";

export default function SoundDiagram({
  src,
  label,
  intro,
  caption,
  activeId,
  onSelect,
}: {
  src: string;
  label: string;
  intro?: string;
  caption: string;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const activeIdRef = useRef(activeId);
  const [failed, setFailed] = useState(false);
  onSelectRef.current = onSelect;
  activeIdRef.current = activeId;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const controller = new AbortController();
    const detach: Array<() => void> = [];

    fetch(src, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("diagram");
        return response.text();
      })
      .then((markup) => {
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = markup;
        setFailed(false);
        const hits = [
          ...hostRef.current.querySelectorAll<SVGGElement>(".sound-diagram-hit"),
        ];
        const onClick = (event: Event) => {
          const target = event.currentTarget;
          if (!(target instanceof SVGGElement) || !target.id) return;
          onSelectRef.current(target.id);
        };
        const onKey = (event: Event) => {
          if (!(event instanceof KeyboardEvent)) return;
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const target = event.currentTarget;
          if (!(target instanceof SVGGElement) || !target.id) return;
          onSelectRef.current(target.id);
        };
        for (const hit of hits) {
          hit.classList.toggle("is-selected", hit.id === activeIdRef.current);
          hit.addEventListener("click", onClick);
          hit.addEventListener("keydown", onKey);
          detach.push(() => {
            hit.removeEventListener("click", onClick);
            hit.removeEventListener("keydown", onKey);
          });
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
      for (const remove of detach) remove();
    };
  }, [src]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    for (const hit of host.querySelectorAll<SVGGElement>(".sound-diagram-hit")) {
      hit.classList.toggle("is-selected", hit.id === activeId);
    }
  }, [activeId, failed]);

  return (
    <figure className="mt-6">
      <figcaption className="text-label-md text-text-secondary">{label}</figcaption>
      {intro ? (
        <p className="mt-2 text-body-main text-text-secondary">{intro}</p>
      ) : null}
      {failed ? (
        <p className="mt-3 text-body-main text-text-secondary">
          No pude cargar el diagrama. Las tarjetas de abajo siguen funcionando.
        </p>
      ) : (
        <div ref={hostRef} className="sound-diagram mt-3" />
      )}
      <p className="mt-2 h-6 text-center text-label-md text-text-primary" aria-live="polite">
        {caption || "\u00a0"}
      </p>
    </figure>
  );
}
