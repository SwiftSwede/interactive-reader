"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ActionButtonState = "idle" | "pending" | "success" | "error";
export type ActionButtonVariant = "primary" | "secondary" | "ghost";

const VARIANT: Record<ActionButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover disabled:opacity-60",
  secondary:
    "border border-paper-line bg-transparent text-text-primary hover:bg-surface-hover disabled:opacity-60",
  ghost:
    "bg-transparent text-text-accent hover:bg-accent-soft active:bg-surface-hover disabled:opacity-60",
};

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: ReactNode;
  successLabel?: ReactNode;
  state?: ActionButtonState;
  variant?: ActionButtonVariant;
};

export default function ActionButton({
  children,
  pendingLabel,
  successLabel,
  state = "idle",
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  ...rest
}: ActionButtonProps) {
  const { pending: formPending } = useFormStatus();
  const pending = state === "pending" || (type === "submit" && formPending);
  const success = state === "success";
  const label = pending
    ? (pendingLabel ?? children)
    : success
      ? (successLabel ?? children)
      : children;

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-card px-5 text-label-md font-medium transition-colors ${VARIANT[variant]} ${className}`.trim()}
    >
      {label}
    </button>
  );
}
