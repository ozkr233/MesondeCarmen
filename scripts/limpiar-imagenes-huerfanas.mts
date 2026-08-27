/**
 * Barrido puntual del bucket `menu-images`.
 *
 * Borra los archivos que ya no referencia ninguna fila de `dishes`. Existe
 * porque hasta ahora `updateDish` pisaba `image_url` sin limpiar la foto
 * anterior, así que el bucket acumuló huérfanos que nadie puede encontrar ya
 * desde la app: la URL era la única referencia al archivo y se perdió al
 * sobrescribirla.
 *
 * Con la fuga cerrada esto es una herramienta de mantenimiento, no algo que
 * haya que ejecutar de forma periódica.
 *
 *   node --env-file=.env.local scripts/limpiar-imagenes-huerfanas.mts
 *   node --env-file=.env.local scripts/limpiar-imagenes-huerfanas.mts --borrar
 *
 * Sin `--borrar` solo informa. Usa la llave secreta, que se salta RLS: es un
 * script de consola, no hay sesión de navegador de la que tirar.
 *
 * Node avisa de que `lib/storage.ts` se reparsea como ES module: es esperado y
 * no afecta a nada. El proyecto no es `"type": "module"` y no merece serlo solo
 * por este script.
 */
import { createClient } from "@supabase/supabase-js";

import { MENU_IMAGES_BUCKET, storagePathFromUrl } from "../lib/storage.ts";

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_ENV =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Cuántos objetos pide cada página del `list`. El máximo que acepta la API. */
const PAGINA = 100;

/**
 * Una foto recién subida todavía puede estar en un formulario abierto sin
 * guardar, y ahí parecería huérfana sin serlo. Se le da una hora de margen.
 */
const MARGEN_MS = 60 * 60 * 1000;

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

  const borrar = process.argv.includes("--borrar");
  const supabase = createClient(URL_ENV, SECRET_ENV, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Qué rutas están referenciadas de verdad.
  const { data: filas, error: errorFilas } = await supabase
    .from("dishes")
    .select("image_url");

  if (errorFilas) {
    // Sin esta lista no se puede decidir nada: un conjunto vacío por un fallo
    // de lectura marcaría el bucket entero como huérfano.
    console.error(`No se pudo leer la tabla dishes: ${errorFilas.message}`);
    process.exit(1);
  }

  const referenciadas = new Set(
    (filas ?? [])
      .map((fila) => storagePathFromUrl(fila.image_url))
      .filter((ruta): ruta is string => ruta !== null),
  );

  // 2. Qué hay dentro del bucket. `list` devuelve como mucho una página, así
  //    que hay que pedirlas hasta que venga una incompleta.
  const objetos: { name: string; created_at: string | null; size: number }[] =
    [];

  for (let offset = 0; ; offset += PAGINA) {
    const { data: pagina, error: errorPagina } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .list("", { limit: PAGINA, offset });

    if (errorPagina) {
      console.error(`No se pudo listar el bucket: ${errorPagina.message}`);
      process.exit(1);
    }
    if (!pagina || pagina.length === 0) break;

    for (const entrada of pagina) {
      // Las carpetas vienen sin `id`, y el placeholder no es un archivo real.
      if (!entrada.id) continue;
      if (entrada.name === ".emptyFolderPlaceholder") continue;
      objetos.push({
        name: entrada.name,
        created_at: entrada.created_at,
        size: Number(entrada.metadata?.size) || 0,
      });
    }

    if (pagina.length < PAGINA) break;
  }

  // 3. Huérfano = nadie lo referencia y ya pasó el margen de cortesía.
  // Un objeto sin `created_at` no se puede fechar, y ante la duda no se borra.
  const limite = Date.now() - MARGEN_MS;
  const huerfanos = objetos.filter(
    (objeto) =>
      !referenciadas.has(objeto.name) &&
      objeto.created_at !== null &&
      new Date(objeto.created_at).getTime() < limite,
  );
  const espacio = huerfanos.reduce((total, objeto) => total + objeto.size, 0);

  console.log(`Bucket:        ${MENU_IMAGES_BUCKET}`);
  console.log(`Archivos:      ${objetos.length}`);
  console.log(`Referenciados: ${referenciadas.size}`);
  console.log(`Huérfanos:     ${huerfanos.length} (${formatearBytes(espacio)})`);

  if (huerfanos.length === 0) {
    console.log("\nNo hay nada que limpiar.");
    return;
  }

  for (const objeto of huerfanos) {
    console.log(`  ${objeto.name}  ${formatearBytes(objeto.size)}`);
  }

  if (!borrar) {
    console.log(
      "\nEsto ha sido solo un informe. Repite con --borrar para eliminarlos.",
    );
    return;
  }

  // 4. En lotes, que `remove` tampoco acepta una lista ilimitada.
  let borrados = 0;
  for (let i = 0; i < huerfanos.length; i += PAGINA) {
    const lote = huerfanos.slice(i, i + PAGINA).map((objeto) => objeto.name);
    const { error: errorBorrado } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .remove(lote);

    if (errorBorrado) {
      console.error(`\nFalló un lote: ${errorBorrado.message}`);
      process.exit(1);
    }
    borrados += lote.length;
  }

  console.log(`\nBorrados ${borrados} archivos (${formatearBytes(espacio)}).`);
}

await main();
