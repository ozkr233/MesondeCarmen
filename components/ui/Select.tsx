"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { useId } from "react";

import {
  fieldBase,
  FieldLabel,
  fieldInvalid,
  fieldNormal,
  fieldParts,
  type FieldExtras,
} from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & FieldExtras;

/**
 * `<select>` nativo con la misma piel que `Input`, error incluido. Nativo a
 * propósito: en el móvil abre el selector del sistema, que es lo que espera
 * quien pide desde el teléfono, y no arrastra ninguna librería nueva.
 */
export function Select({
  label,
  error,
  hint,
  className,
  id,
  children,
  ...props
}: Props) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const field = fieldParts(selectId, error, hint);

  return (
    <div>
      <FieldLabel htmlFor={selectId} label={label} required={props.required} />
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            fieldBase,
            error ? fieldInvalid : fieldNormal,
            "appearance-none pr-10",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={field.describedBy}
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
      {field.messages}
    </div>
  );
}
