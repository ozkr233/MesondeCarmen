import { isOrderCode } from "@/lib/order-code";

/**
 * Eventos del embudo: qué se mide y qué forma tiene cada uno.
 *
 * Lo comparten el navegador (`lib/analytics.ts`, que los manda) y el servidor
 * (`app/api/events/route.ts`, que los guarda en `public.events`), así que es un
 * módulo puro, sin `server-only`. Los nombres son también los del `check` de
 * la tabla (`supabase/12_eventos.sql`): uno nuevo hay que añadirlo en los dos
 * sitios.
 */

/** De dónde salió un clic a WhatsApp que no lleva pedido armado. */
export const WHATSAPP_ORIGINS = [
  "hero",
  "header",
  "fab",
  "carta",
  "ubicacion",
] as const;

export type WhatsAppOrigin = (typeof WHATSAPP_ORIGINS)[number];

export type Events = {
  /** El visitante agregó un plato al carrito. */
  carrito_agregado: { plato: string };
  /**
   * Llegó por un enlace compartido (`/carta?plato=...`) y el plato entró solo
   * al carrito. Separado de `carrito_agregado` para poder medir qué enlace
   * compartido convierte.
   */
  carrito_deeplink: { plato: string };
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

export type EventName = keyof Events;

export type TrackedEvent = {
  [K in EventName]: { name: K; props: Events[K] };
}[EventName];

/** Holgado para un nombre de plato; corta lo que no puede serlo. */
const MAX_TEXT = 120;
/** Pesos. Ningún pedido de un restaurante se acerca a esto. */
const MAX_AMOUNT = 100_000_000;
const MAX_ITEMS = 1000;

type Props = Record<string, unknown>;

function isText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= MAX_TEXT
  );
}

function isAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_AMOUNT
  );
}

function isCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_ITEMS
  );
}

function isOrigin(value: unknown): value is WhatsAppOrigin {
  return (WHATSAPP_ORIGINS as readonly unknown[]).includes(value);
}

/**
 * Un validador por evento. Cada uno reconstruye las props campo a campo: lo
 * que no reconoce no llega a la base, por mucho que lo mande el navegador.
 */
const PARSERS: { [K in EventName]: (props: Props) => Events[K] | null } = {
  carrito_agregado: ({ plato }) => (isText(plato) ? { plato } : null),
  carrito_deeplink: ({ plato }) => (isText(plato) ? { plato } : null),
  checkout_iniciado: ({ total, items }) =>
    isAmount(total) && isCount(items) ? { total, items } : null,
  pedido_enviado: ({ total, items, code }) =>
    isAmount(total) &&
    isCount(items) &&
    (code === null || (typeof code === "string" && isOrderCode(code)))
      ? { total, items, code }
      : null,
  whatsapp_click: ({ origen }) => (isOrigin(origen) ? { origen } : null),
};

function isEventName(value: unknown): value is EventName {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(PARSERS, value)
  );
}

/**
 * Valida un evento que llega del navegador. Devuelve null ante cualquier cosa
 * que no sea exactamente uno de los eventos de arriba.
 */
export function parseEvent(input: unknown): TrackedEvent | null {
  if (typeof input !== "object" || input === null) return null;

  const { name, props } = input as { name?: unknown; props?: unknown };
  if (!isEventName(name)) return null;
  if (typeof props !== "object" || props === null) return null;

  const parsed = PARSERS[name](props as Props);
  return parsed ? ({ name, props: parsed } as TrackedEvent) : null;
}
