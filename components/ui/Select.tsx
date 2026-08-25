"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { useId } from "react";

import { fieldClasses, labelClasses } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

/**
 * `<select>` nativo con la misma piel que `Input`. Nativo a propósito: en el
 * móvil abre el selector del sistema, que es lo que espera quien administra la
 * carta desde el teléfono, y no arrastra ninguna librería nueva.
 */
export function Select({ label, className, id, children, ...props }: Props) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={selectId} className={labelClasses}>
          {label}
          {props.required && <span className="text-primary"> *</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(fieldClasses, "appearance-none pr-10", className)}
          {...props}
        >
          {children}
        </select>
        {/* La flecha propia sustituye a la del navegador, que `appearance-none`
            quita para que el campo case con el resto del formulario. */}
        <ChevronDown
          size={18}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dark/40"
        />
      </div>
    </div>
  );
}
