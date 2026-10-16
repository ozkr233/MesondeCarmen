/**
 * Achica una foto en el navegador antes de subirla al bucket.
 *
 * Las fotos no pasan por la optimización de Vercel (ver `next.config.ts`): se
 * sirven tal cual desde Supabase, así que tienen que llegar ya ligeras. Una
 * foto de celular de varios MB queda en ~100 KB.
 *
 * Solo navegador: usa `createImageBitmap` y `<canvas>`.
 */

/**
 * Lado mayor máximo. En un celular la tarjeta ocupa ~400 px CSS a 3×, y en
 * escritorio un tercio del ancho a 2×: 1200 px cubren los dos casos.
 */
const MAX_SIDE = 1200;

const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.82;

/** Formatos que cualquier navegador muestra, y que por eso se pueden subir tal cual. */
const WEB_SAFE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function withExtension(name: string, extension: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "foto";
  return `${base}.${extension}`;
}

export async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    // `from-image` aplica la rotación EXIF: sin esto, las fotos verticales de
    // celular saldrían acostadas.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Pasa con HEIC fuera de Safari, o con un archivo que no es una imagen.
    throw new Error(
      "No se pudo procesar la imagen. Prueba con una foto JPG o PNG.",
    );
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("No se pudo procesar la imagen en este navegador.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await toBlob(canvas, "image/webp", WEBP_QUALITY);
  let extension = "webp";

  // Los Safari viejos no codifican WebP y devuelven un PNG en su lugar, que
  // pesaría más que el original. JPEG no tiene transparencia: se rellena de
  // blanco por detrás para que los fondos transparentes no salgan negros.
  if (!blob || blob.type !== "image/webp") {
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    blob = await toBlob(canvas, "image/jpeg", JPEG_QUALITY);
    extension = "jpg";
  }

  if (!blob) {
    throw new Error("No se pudo procesar la imagen en este navegador.");
  }

  // Una imagen que ya venía pequeña puede crecer al recodificarla.
  if (blob.size >= file.size && WEB_SAFE.has(file.type)) return file;

  return new File([blob], withExtension(file.name, extension), {
    type: blob.type,
  });
}
