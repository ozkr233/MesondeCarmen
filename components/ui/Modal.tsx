"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, children, className }: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    // Evita que la página de fondo se desplace con el modal abierto.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        className="fixed inset-0 bg-dark/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 my-8 w-full max-w-lg rounded-xl bg-white shadow-2xl",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-dark/10 px-6 py-4">
          <h3 className="text-xl font-bold text-dark">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-dark/50 transition-colors hover:bg-dark/5 hover:text-dark"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
