import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "whatsapp" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark shadow-sm focus-visible:outline-primary",
  whatsapp: "btn-wa focus-visible:outline-whatsapp",
  outline:
    "border-2 border-primary text-primary hover:bg-primary hover:text-white focus-visible:outline-primary",
  ghost: "text-dark/70 hover:bg-dark/5 focus-visible:outline-dark",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-4 text-lg",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-bold uppercase tracking-wide transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
