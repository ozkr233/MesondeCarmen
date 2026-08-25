/**
 * Estilos compartidos por los campos de formulario (`Input`, `Textarea`,
 * `Select`). Viven aquí y no dentro de `Input.tsx` para que un campo nuevo
 * herede el mismo borde y el mismo foco sin copiar la cadena de clases.
 *
 * El color del borde va aparte de la base porque `cn()` solo concatena: si un
 * campo llevara `border-dark/15` y `border-red-500` a la vez, cuál gana lo
 * decidiría el orden del CSS generado, no el del string. Separándolo, al
 * elemento solo llega una de las dos.
 */

export const fieldBase =
  "w-full rounded-lg border bg-white px-4 py-2.5 text-dark " +
  "placeholder:text-dark/35 transition-colors " +
  "focus:outline-2 focus:outline-offset-0 " +
  "disabled:cursor-not-allowed disabled:bg-dark/5";

export const fieldNormal =
  "border-dark/15 focus:border-primary focus:outline-primary/30";

export const fieldInvalid =
  "border-red-500 focus:border-red-500 focus:outline-red-500/30";

/** Campo sin estado de error. Lo usan `Select` y cualquier campo sin validar. */
export const fieldClasses = `${fieldBase} ${fieldNormal}`;

export const labelClasses = "mb-1.5 block text-sm font-semibold text-dark/80";
