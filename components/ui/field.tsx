/**
 * Lo que comparten los campos de formulario (`Input`, `Textarea`, `Select`):
 * los estilos y el montaje de etiqueta, ayuda y error. Vive aquí y no dentro de
 * `Input.tsx` para que un campo nuevo herede el mismo borde, el mismo foco y el
 * mismo trato de accesibilidad sin copiar nada.
 *
 * El color del borde va aparte de la base porque `cn()` solo concatena: si un
 * campo llevara `border-dark/15` y `border-red-500` a la vez, cuál gana lo
 * decidiría el orden del CSS generado, no el del string. Separándolo, al
 * elemento solo llega una de las dos.
 */

import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export const fieldBase =
  "w-full rounded-lg border bg-white px-4 py-2.5 text-dark " +
  "placeholder:text-dark/35 transition-colors " +
  "focus:outline-2 focus:outline-offset-0 " +
  "disabled:cursor-not-allowed disabled:bg-dark/5";

export const fieldNormal =
  "border-dark/15 focus:border-primary focus:outline-primary/30";

export const fieldInvalid =
  "border-red-500 focus:border-red-500 focus:outline-red-500/30";

export const labelClasses = "mb-1.5 block text-sm font-semibold text-dark/80";

/** Lo que un campo añade a los atributos nativos de su control. */
export type FieldExtras = {
  label?: string;
  /** Mensaje de error. Pinta el campo en rojo y lo anuncia al leerlo. */
  error?: string | null;
  /** Texto de apoyo bajo el campo. Acepta nodos para contadores o avisos. */
  hint?: ReactNode;
};

export function FieldLabel({
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
 * Ayuda y error comparten el mismo montaje en todos los campos. El error lleva
 * `role="alert"` para que un lector de pantalla lo anuncie al aparecer, y
 * ambos se enlazan al control con `aria-describedby`.
 */
export function fieldParts(
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
