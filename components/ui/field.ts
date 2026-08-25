/**
 * Estilos compartidos por los campos de formulario (`Input`, `Textarea`,
 * `Select`). Viven aquí y no dentro de `Input.tsx` para que un campo nuevo
 * herede el mismo borde y el mismo foco sin copiar la cadena de clases.
 */

export const fieldClasses =
  "w-full rounded-lg border border-dark/15 bg-white px-4 py-2.5 text-dark " +
  "placeholder:text-dark/35 transition-colors " +
  "focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/30 " +
  "disabled:cursor-not-allowed disabled:bg-dark/5";

export const labelClasses = "mb-1.5 block text-sm font-semibold text-dark/80";
