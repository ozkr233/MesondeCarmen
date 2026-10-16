import { parseEvent } from "@/lib/events";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Recibe los eventos del embudo que manda `trackEvent` y los guarda en
 * `public.events`, de donde salen las cifras del embudo en `/admin/pedidos`.
 *
 * Es público, como `saveOrder`, y por la misma razón escribe con la llave
 * secreta: la tabla no acepta inserts de `anon`, así que esta es la única
 * puerta, y por ella solo pasa lo que reconoce `parseEvent`, reconstruido
 * campo a campo.
 *
 * Es un Route Handler y no una Server Action a propósito: las acciones se
 * encolan una detrás de otra, y un evento podía retrasar el registro del
 * pedido. Además `sendBeacon` solo sabe hacer un POST a una URL.
 *
 * Responde siempre 204. El navegador no lee la respuesta, y un error con
 * detalle solo le serviría a quien esté probando qué cuela.
 */

/** Un evento válido ocupa menos de 300 bytes. */
const MAX_BODY = 2048;

function done() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  // Solo eventos de la propia página. Los navegadores viejos que no mandan la
  // cabecera pasan: no vale la pena perderlos por esto.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return done();

  const body = await request.text();
  if (body.length > MAX_BODY) return done();

  // `sendBeacon` manda el JSON como text/plain: se parsea a mano.
  let event: ReturnType<typeof parseEvent> = null;
  try {
    event = parseEvent(JSON.parse(body));
  } catch {
    // JSON roto: se descarta igual que un evento desconocido.
  }
  if (!event) return done();

  try {
    const { error } = await createAdminClient()
      .from("events")
      .insert({ name: event.name, props: event.props });
    if (error) console.error("[events] insert:", error.message);
  } catch (error) {
    console.error("[events] llave secreta:", error);
  }

  return done();
}
