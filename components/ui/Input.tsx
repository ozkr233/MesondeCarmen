"use client";

import { AlertCircle } from "lucide-react";
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";

import {
  fieldBase,
  fieldInvalid,
  fieldNormal,
  labelClasses,
} from "@/components/ui/field";
import { cn } from "@/lib/cn";

type FieldExtras = {
  label?: string;
  /** Mensaje de error. Pinta el campo en rojo y lo anuncia al leerlo. */
  error?: string | null;
  /** Texto de apoyo bajo el campo. Acepta nodos para contadores o avisos. */
  hint?: ReactNode;
};

type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldExtras;

export function Input({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const field = fieldParts(inputId, error, hint);

  return (
    <div>
      <FieldLabel htmlFor={inputId} label={label} required={props.required} />
      <input
        id={inputId}
        className={cn(fieldBase, error ? fieldInvalid : fieldNormal, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={field.describedBy}
        {...props}
      />
      {field.messages}
    </div>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldExtras;

export function Textarea({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const field = fieldParts(textareaId, error, hint);

  return (
    <div>
      <FieldLabel htmlFor={textareaId} label={label} required={props.required} />
      <textarea
        id={textareaId}
        className={cn(
          fieldBase,
          error ? fieldInvalid : fieldNormal,
          "resize-y",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={field.describedBy}
        {...props}
      />
      {field.messages}
    </div>
  );
}

function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor: string;
  label?: string;
  required?: boolean;
}) {
  if (!label) return null;
  return (
    <label htmlFor={htmlFor} className={labelClasses}>
      {label}
      {required && <span className="text-primary"> *</span>}
    </label>
  );
}

/**
 * Ayuda y error comparten el mismo montaje en los dos campos. El error lleva
 * `role="alert"` para que un lector de pantalla lo anuncie al aparecer, y
 * ambos se enlazan al control con `aria-describedby`.
 */
function fieldParts(
  fieldId: string,
  error: string | null | undefined,
  hint: ReactNode,
) {
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  const messages = (
    <>
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-dark/50">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-sm text-red-700"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </>
  );

  return { describedBy, messages };
}
