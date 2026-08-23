import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dark/5 bg-white shadow-lg",
        className,
      )}
      {...props}
    />
  );
}
