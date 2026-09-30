"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { snoozeMissionCard } from "@/app/dashboard/mission-actions";
import { isMissionSnoozed, nextLocalMidnight } from "@/lib/mission-snooze";

const subscribeNever = () => () => {};

export default function MissionCard({
  displayName,
  dismissedUntil,
}: {
  displayName: string;
  dismissedUntil: string | null;
}) {
  // A snoozed card waits for the phone clock so it never flashes on first paint.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
  const [hiddenLocally, setHiddenLocally] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const snoozed = hydrated
    ? isMissionSnoozed(dismissedUntil)
    : dismissedUntil != null;
  if (snoozed || hiddenLocally) return null;

  const onLater = () => {
    setError(null);
    setHiddenLocally(true);
    const until = nextLocalMidnight().toISOString();
    startTransition(async () => {
      const result = await snoozeMissionCard(until);
      if (!result.ok) {
        setHiddenLocally(false);
        setError(result.error);
      }
    });
  };

  return (
    <section className="mt-4 rounded-card border border-paper-line bg-surface px-4 py-3">
      <h2 className="text-headline-md text-text-primary">{displayName}</h2>
      <p className="mt-1 text-body-main text-text-secondary">
        Practícalo cuando quieras.
      </p>
      <div className="mt-3 flex items-center gap-4">
        <Link
          href="/tools/practica"
          className="inline-flex min-h-12 items-center justify-center rounded-card bg-accent px-5 text-label-md font-medium text-white transition-colors hover:bg-accent-hover active:bg-accent-hover"
        >
          Practicar
        </Link>
        <button
          type="button"
          onClick={onLater}
          disabled={pending}
          className="min-h-11 px-1 text-label-sm text-text-muted hover:text-text-secondary disabled:opacity-60"
        >
          más tarde
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-label-sm text-error" role="status">
          {error}
        </p>
      ) : null}
    </section>
  );
}
