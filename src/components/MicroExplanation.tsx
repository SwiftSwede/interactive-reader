"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type MicroExplanationProps = {
  text: string;
  dismissKey: string;
  onDismiss?: () => void;
};

const STORAGE_PREFIX = "micro-explained:";

export default function MicroExplanation({
  text,
  dismissKey,
  onDismiss,
}: MicroExplanationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(`${STORAGE_PREFIX}${dismissKey}`) === "1") {
        return;
      }
    } catch {
      // localStorage can be blocked
    }
    setVisible(true);
  }, [dismissKey]);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${dismissKey}`, "1");
    } catch {
      // ignore
    }
    if (onDismiss) onDismiss();
  };

  if (!visible) return null;

  return (
    <div className="micro-explanation">
      <button
        onClick={handleDismiss}
        className="micro-explanation-dismiss"
        aria-label="Cerrar"
        type="button"
      >
        <X size={14} aria-hidden="true" />
      </button>
      {text}
    </div>
  );
}
