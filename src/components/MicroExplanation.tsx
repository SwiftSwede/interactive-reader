"use client";

import { useState } from "react";

type MicroExplanationProps = {
  text: string;
  onDismiss?: () => void;
};

export default function MicroExplanation({ text, onDismiss }: MicroExplanationProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  return (
    <div className="micro-explanation">
      <button
        onClick={handleDismiss}
        className="micro-explanation-dismiss"
        aria-label="Cerrar"
        type="button"
      >
        x
      </button>
      {text}
    </div>
  );
}
