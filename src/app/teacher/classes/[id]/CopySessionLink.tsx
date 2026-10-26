"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { TEACHER_BUTTON_COMPACT } from "@/components/teacher/teacher-ui";

export default function CopySessionLink({
  href,
  compact = false,
}: {
  href: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = href.startsWith("http")
      ? href
      : `${window.location.origin}${href}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("CopySessionLink: clipboard write failed", error);
      setCopied(false);
    }
  };

  const Icon = copied ? Check : LinkIcon;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        compact
          ? TEACHER_BUTTON_COMPACT
          : `${TEACHER_BUTTON_COMPACT} w-full`
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}
