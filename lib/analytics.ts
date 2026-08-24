import { track } from "@vercel/analytics";

/**
 * Eventos del embudo, con los nombres en un solo sitio para que no se
 * dispersen strings sueltos por los componentes y el panel de Vercel no
 * termine con tres variantes del mismo evento.
 *
 * En desarrollo `track` no envía nada: escribe el evento en la consola del
 * navegador, que es justo lo que sirve para verificar en local.
 */

/** De dónde salió un clic a WhatsApp que no lleva pedido armado. */
export type WhatsAppOrigin =
  | "hero"
  | "header"
  | "fab"
  | "carta"
  | "ubicacion";

type Events = {
  /** El visitante agregó un plato al carrito. */
  carrito_agregado: { plato: string };
  /** Pasó del carrito al formulario de datos. */
  checkout_iniciado: { total: number; items: number };
  /**
   * La conversión: el pedido salió de la página hacia WhatsApp. `code` viene
   * null si Supabase falló y el pedido se envió sin quedar registrado.
   */
  pedido_enviado: { total: number; items: number; code: string | null };
  /** Clic en uno de los enlaces de saludo, sin pedido de por medio. */
  whatsapp_click: { origen: WhatsAppOrigin };
};

export function trackEvent<K extends keyof Events>(
  name: K,
  properties: Events[K],
): void {
  track(name, properties);
}
