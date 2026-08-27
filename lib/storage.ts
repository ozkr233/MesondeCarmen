/**
 * El bucket de las fotos de los platos y la traducción entre su URL pública y
 * la ruta del archivo dentro del bucket.
 *
 * Vive aquí, en un módulo sin dependencias, porque lo necesitan tres sitios
 * que no pueden importarse entre sí: el navegador (`DishForm`, al subir), el
 * servidor (`app/admin/actions.ts`, al limpiar) y el script de mantenimiento.
 * `actions.ts` es `"use server"`, así que no puede exportar nada que no sea
 * una función async — de ahí que el helper no pueda vivir allí.
 */

export const MENU_IMAGES_BUCKET = "menu-images";

const PUBLIC_MARKER = `/storage/v1/object/public/${MENU_IMAGES_BUCKET}/`;

/**
 * Extrae la ruta dentro del bucket de una URL pública de Supabase Storage.
 * Devuelve null para imágenes externas, que no nos toca borrar.
 */
export function storagePathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const index = url.indexOf(PUBLIC_MARKER);
  if (index === -1) return null;
  const path = url.slice(index + PUBLIC_MARKER.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}
