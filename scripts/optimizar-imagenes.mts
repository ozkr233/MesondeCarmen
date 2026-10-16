/**
 * Recomprime una vez las fotos que ya estaban en el bucket `menu-images`.
 *
 * Las fotos dejaron de pasar por la optimización de Vercel (ver
 * `next.config.ts`) y ahora se sirven tal cual desde Supabase. Las nuevas se
 * achican en el navegador al subirlas (`lib/compress-image.ts`); las de antes
 * se subieron como salieron del celular y hay que pasarlas por aquí.
 *
 *   node --env-file=.env.local scripts/optimizar-imagenes.mts
 *   node --env-file=.env.local scripts/optimizar-imagenes.mts --aplicar
 *
 * Sin `--aplicar` solo informa de cuánto se ahorraría. Con `--aplicar`, cada
 * foto se sube a una ruta nueva `<uuid>.webp`, la fila pasa a apuntarle y la
 * vieja se borra. Ruta nueva y no sobrescribir: así ninguna caché se queda
 * sirviendo la versión anterior.
 *
 * Se saltan las URLs externas (no son nuestras) y las que ya son `.webp`, que
 * salieron de aquí o de la subida nueva: recomprimirlas solo perdería calidad.
 *
 * Usa la llave secreta, que se salta RLS. Node avisa de que `lib/storage.ts`
 * se reparsea como ES module: es esperado (ver `limpiar-imagenes-huerfanas.mts`).
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { MENU_IMAGES_BUCKET, storagePathFromUrl } from "../lib/storage.ts";

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_ENV =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Los mismos valores que usa `lib/compress-image.ts` en el navegador. */
const MAX_SIDE = 1200;
const WEBP_QUALITY = 80;

/** Un año: el nombre es un UUID nuevo, el archivo nunca cambia de contenido. */
const CACHE_CONTROL = "31536000";

function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  if (!URL_ENV || !SECRET_ENV) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.\n" +
        "Ejecuta el script con --env-file=.env.local.",
    );
    process.exit(1);
  }

  const aplicar = process.argv.includes("--aplicar");
  const supabase = createClient(URL_ENV, SECRET_ENV, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = supabase.storage.from(MENU_IMAGES_BUCKET);

  const { data: filas, error: errorFilas } = await supabase
    .from("dishes")
    .select("id, name, image_url");

  if (errorFilas) {
    console.error(`No se pudo leer la tabla dishes: ${errorFilas.message}`);
    process.exit(1);
  }

  // Agrupadas por archivo: hoy cada plato tiene su copia (`duplicateDish`),
  // pero si dos filas viejas compartieran uno, borrarlo al procesar la primera
  // dejaría a la segunda sin foto.
  const pendientes = new Map<string, { ids: string[]; nombre: string }>();
  for (const fila of filas ?? []) {
    const ruta = storagePathFromUrl(fila.image_url);
    if (!ruta || ruta.toLowerCase().endsWith(".webp")) continue;
    const grupo = pendientes.get(ruta);
    if (grupo) grupo.ids.push(fila.id);
    else pendientes.set(ruta, { ids: [fila.id], nombre: fila.name });
  }

  console.log(`Bucket:      ${MENU_IMAGES_BUCKET}`);
  console.log(`Platos:      ${filas?.length ?? 0}`);
  console.log(`Por revisar: ${pendientes.size}\n`);

  let procesadas = 0;
  let fallidas = 0;
  let antesTotal = 0;
  let despuesTotal = 0;

  for (const [ruta, { ids, nombre }] of pendientes) {
    const { data: original, error: errorDescarga } =
      await bucket.download(ruta);
    if (errorDescarga || !original) {
      console.error(
        `  ✗ ${nombre}: no se pudo descargar (${errorDescarga?.message})`,
      );
      fallidas += 1;
      continue;
    }

    const antes = Buffer.from(await original.arrayBuffer());
    let despues: Buffer;
    try {
      // `rotate()` sin argumentos aplica la orientación EXIF antes de que
      // `webp()` descarte los metadatos.
      despues = await sharp(antes)
        .rotate()
        .resize({
          width: MAX_SIDE,
          height: MAX_SIDE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (error) {
      console.error(
        `  ✗ ${nombre}: no se pudo procesar (${(error as Error).message})`,
      );
      fallidas += 1;
      continue;
    }

    if (despues.length >= antes.length) {
      console.log(
        `  = ${nombre}: ya era ligera (${formatearBytes(antes.length)}), se deja`,
      );
      continue;
    }

    console.log(
      `  ${aplicar ? "✓" : "·"} ${nombre}: ` +
        `${formatearBytes(antes.length)} → ${formatearBytes(despues.length)}`,
    );

    if (aplicar) {
      const rutaNueva = `${crypto.randomUUID()}.webp`;
      const { error: errorSubida } = await bucket.upload(rutaNueva, despues, {
        cacheControl: CACHE_CONTROL,
        upsert: false,
        contentType: "image/webp",
      });
      if (errorSubida) {
        console.error(`    No se pudo subir: ${errorSubida.message}`);
        fallidas += 1;
        continue;
      }

      const { error: errorFila } = await supabase
        .from("dishes")
        .update({ image_url: bucket.getPublicUrl(rutaNueva).data.publicUrl })
        .in("id", ids);
      if (errorFila) {
        // Las filas siguen apuntando a la foto vieja: la nueva sería un huérfano.
        console.error(`    No se pudo actualizar la fila: ${errorFila.message}`);
        await bucket.remove([rutaNueva]);
        fallidas += 1;
        continue;
      }

      // Si esto falla la carta ya usa la nueva; la vieja la recoge
      // `limpiar-imagenes-huerfanas.mts`.
      const { error: errorBorrado } = await bucket.remove([ruta]);
      if (errorBorrado) {
        console.error(`    No se pudo borrar la vieja: ${errorBorrado.message}`);
      }
    }

    procesadas += 1;
    antesTotal += antes.length;
    despuesTotal += despues.length;
  }

  console.log(
    `\n${aplicar ? "Optimizadas" : "Se optimizarían"}: ${procesadas} ` +
      `(${formatearBytes(antesTotal)} → ${formatearBytes(despuesTotal)})`,
  );
  if (fallidas > 0) console.log(`Con errores: ${fallidas}`);

  if (!aplicar && procesadas > 0) {
    console.log(
      "\nEsto ha sido solo un informe. Repite con --aplicar para hacerlo.",
    );
  }
  if (fallidas > 0) process.exit(1);
}

await main();
