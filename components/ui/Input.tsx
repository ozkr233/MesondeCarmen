"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
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
