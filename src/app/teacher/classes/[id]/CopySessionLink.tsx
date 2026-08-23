"use client";

import { useState } from "react";

export default function CopySessionLink({
  slug,
  token,
}: {
  slug: string;
  token: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/story/${slug}?session=${token}`;
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
      className="flex h-11 w-full items-center justify-center whitespace-nowrap rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-800"
    >
      {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}
