"use client";

import { useState } from "react";

export default function CopySessionLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = href.startsWith("http")
      ? href
      : `${window.location.origin}${href}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-11 w-full items-center justify-center whitespace-nowrap rounded-card border border-paper-line px-3 text-sm font-medium text-text-primary"
    >
      {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}
