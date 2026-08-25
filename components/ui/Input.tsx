"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";

import { fieldClasses, labelClasses } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export function Input({ label, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className={labelClasses}>
          {label}
          {props.required && <span className="text-primary"> *</span>}
        </label>
      )}
      <input id={inputId} className={cn(fieldClasses, className)} {...props} />
    </div>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={textareaId} className={labelClasses}>
          {label}
          {props.required && <span className="text-primary"> *</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(fieldClasses, "resize-y", className)}
        {...props}
      />
    </div>
  );
}
