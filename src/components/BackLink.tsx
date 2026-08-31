import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function BackLink({
  href,
  label = "Volver",
  showLabel = false,
}: {
  href: string;
  label?: string;
  showLabel?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`-ml-2 inline-flex h-11 shrink-0 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent active:bg-surface-hover ${
        showLabel ? "gap-1 px-2" : "w-11"
      }`}
    >
      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      {showLabel && <span className="text-label-md">{label}</span>}
    </Link>
  );
}
