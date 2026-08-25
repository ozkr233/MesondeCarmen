import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la llave secreta de Supabase. Se salta RLS por completo.
 *
 * Existe por una sola razón: `orders` y `order_items` ya no aceptan escrituras
 * de `anon` (ver `supabase/05_pedidos_solo_servidor.sql`), así que registrar un
 * pedido es cosa del servidor. Todo lo demás — la carta, los ajustes, el panel
 * — sigue pasando por `createClient()` de `./server`, donde RLS manda.
 *
 * El `import "server-only"` de la primera línea es la guarda que de verdad
 * importa: si algún día alguien importa este módulo desde un componente
 * cliente, el build falla en vez de publicar la llave en el bundle.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Sin prefijo `NEXT_PUBLIC_` a propósito: ese prefijo es exactamente lo que
 * hace que Next sustituya la variable en el código que se manda al navegador.
 * Una llave secreta con ese prefijo se publica a internet en el primer deploy.
 *
 * Supabase renombró `service_role` (JWT) a `secret` (`sb_secret_…`). Se aceptan
 * las dos, igual que con la publicable, para no romper proyectos antiguos.
 */
const SECRET_ENV =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAdminClient() {
  if (!URL_ENV || !SECRET_ENV) {
    throw new Error(
      "Falta SUPABASE_SECRET_KEY: sin ella el servidor no puede registrar " +
        "pedidos. Cópiala de Supabase → Project Settings → API Keys → Secret " +
        "keys y añádela al entorno (nunca con el prefijo NEXT_PUBLIC_).",
    );
  }

  return createClient(URL_ENV, SECRET_ENV, {
    // No hay sesión que mantener ni token que refrescar: la autoridad es la
    // llave, y el cliente se crea y se tira dentro de una sola petición.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
