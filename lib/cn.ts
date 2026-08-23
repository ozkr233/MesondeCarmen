/** Une clases ignorando falsy. Suficiente sin traer clsx/tailwind-merge. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
