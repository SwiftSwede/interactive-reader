import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function BackLink({
  href,
  label = "Volver",
  showLabel = false,
  compact = false,
  className = "",
}: {
  href: string;
  label?: string;
  showLabel?: boolean;
  /** Toolbar chevron above the title: 32px chip, 44px hit area. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-card text-text-secondary [transition:background-color_200ms_var(--ease-smooth-out),color_200ms_var(--ease-smooth-out)] hover:bg-accent-soft hover:text-text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-surface-hover ${
        showLabel ? "-ml-2 h-11 gap-1 px-2" : compact ? "relative h-8 w-8" : "-ml-2 h-11 w-11"
      } ${className}`}
    >
      {compact ? (
        <span className="absolute -inset-1.5" aria-hidden="true" />
      ) : null}
      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      {showLabel && <span className="text-label-md">{label}</span>}
    </Link>
  );
}
