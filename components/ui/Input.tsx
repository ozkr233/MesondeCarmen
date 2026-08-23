"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";

import { cn } from "@/lib/cn";

const fieldClasses =
  "w-full rounded-lg border border-dark/15 bg-white px-4 py-2.5 text-dark " +
  "placeholder:text-dark/35 transition-colors " +
  "focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/30 " +
  "disabled:cursor-not-allowed disabled:bg-dark/5";

const labelClasses = "mb-1.5 block text-sm font-semibold text-dark/80";

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
