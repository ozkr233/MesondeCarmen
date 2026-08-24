"use client";

import { cn } from "@/lib/cn";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  /** Color de la posición encendida. Por defecto verde (disponible). */
  tone?: "green" | "gold";
};

const tones = {
  green: "bg-green-600",
  gold: "bg-secondary",
} as const;

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  tone = "green",
}: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? tones[tone] : "bg-dark/20",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
