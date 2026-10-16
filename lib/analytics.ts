import type { Events } from "@/lib/events";

export type { WhatsAppOrigin } from "@/lib/events";

/**
 * Manda un evento del embudo a `/api/events`, que lo guarda en Supabase para
 * la tarjeta del embudo de `/admin/pedidos`. Los nombres y la forma de cada
 * evento viven en `lib/events.ts`, para que no se dispersen strings sueltos por
 * los componentes.
 *
 * `sendBeacon` y no un `fetch` normal: no bloquea nada, el navegador lo entrega
 * aunque la pestaña navegue o se cierre, y no se encola detrás de la Server
 * Action del pedido. Es fire-and-forget: si falla, se pierde un evento y nada
 * más.
 *
 * En desarrollo no se manda nada: el evento se escribe en la consola del
 * navegador, que es justo lo que sirve para verificar en local. Local y
 * producción comparten la misma base de Supabase, y las pruebas ensuciarían
 * las cifras del panel.
 */

const ENDPOINT = "/api/events";

export function trackEvent<K extends keyof Events>(
  name: K,
  props: Events[K],
): void {
  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", name, props);
    return;
  }

  const body = JSON.stringify({ name, props });

  try {
    if (navigator.sendBeacon?.(ENDPOINT, body)) return;
  } catch {
    // Algunos navegadores lanzan en vez de devolver false: se intenta con fetch.
  }

  fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
}
