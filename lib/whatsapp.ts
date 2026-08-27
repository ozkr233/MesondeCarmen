import { formatCOP } from "@/lib/format";
import { site } from "@/lib/site";
import { parseCashBill, PAYMENT_LABELS, type PaymentMethod } from "@/lib/validation";
import { sumItems } from "@/store/cart";
import type { CartItem } from "@/types/dish";

/**
 * Número del restaurante en formato internacional sin `+` ni separadores.
 *
 * Sale de `site.phoneE164`, que es el mismo dato que se muestra en la web y que
 * se publica en los datos estructurados. Antes había aquí una copia literal, y
 * un cambio de teléfono podía dejar los botones de WhatsApp apuntando a un
 * número y a Google anunciando otro.
 *
 * `NEXT_PUBLIC_WHATSAPP_NUMBER` sigue funcionando, pero ya solo como override:
 * sirve para que un deploy de preview escriba a un número de pruebas sin tocar
 * los datos del negocio. Para cambiar el teléfono de verdad, `lib/site.ts`.
 */
export const WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? site.phoneE164
).replace(/\D/g, "");

export type CustomerInfo = {
  name: string;
  phone: string;
  address: string;
  notes: string;
  payment: string;
  cashBill: string;
};

/**
 * Cómo va a pagar el cliente, en una línea.
 *
 * Con efectivo se resuelve aquí el cálculo que si no haría el dueño con el
 * cliente en la puerta: cuánto cambio hay que llevar. Si el billete no alcanza
 * para el total no se escribe cambio alguno — se lo aclaran por el chat.
 */
function paymentLine(customer: CustomerInfo, total: number): string | null {
  const method = customer.payment as PaymentMethod;
  // `in` también encuentra lo que hereda del prototipo ("constructor",
  // "toString"), y esos no son métodos de pago.
  if (!Object.hasOwn(PAYMENT_LABELS, method)) return null;

  const label = PAYMENT_LABELS[method];
  const bill = parseCashBill(customer);
  if (bill === null) return `*Pago:* ${label}`;
  if (bill === 0) return `*Pago:* ${label} — paga con el valor exacto`;

  const change = bill - total;
  const suffix = change > 0 ? ` (cambio: ${formatCOP(change)})` : "";
  return `*Pago:* ${label} — paga con ${formatCOP(bill)}${suffix}`;
}

/** Enlace de chat suelto, para los botones de "Pedir ahora" del sitio. */
export function whatsappLink(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const DEFAULT_GREETING =
  "Hola, vi su publicidad en internet. ¿Aún tienen comida disponible para envío?";

/**
 * Arma el pedido completo. WhatsApp interpreta *texto* como negrita.
 *
 * El `code` es el que devuelve `saveOrder` al guardar el pedido en Supabase.
 * Es opcional a propósito: si la base falla, el mensaje sale igual (sin
 * código) antes que perder la venta.
 */
export function buildOrderMessage(
  items: CartItem[],
  customer: CustomerInfo,
  deliveryFee = 0,
  code?: string | null,
): string {
  const lines = items.map(
    (item) =>
      `• ${item.quantity} x ${item.name} — ${formatCOP(item.price * item.quantity)}`,
  );

  const subtotal = sumItems(items);

  const parts = [
    "*NUEVO PEDIDO — El Mesón de Carmen*",
    ...(code ? [`*Pedido #${code}*`] : []),
    "",
    `*Cliente:* ${customer.name}`,
    `*Teléfono:* ${customer.phone}`,
    `*Dirección:* ${customer.address}`,
    "",
    "*Pedido:*",
    ...lines,
    "",
  ];

  // Sin tarifa configurada no se manda una línea de "Domicilio: $0".
  if (deliveryFee > 0) {
    parts.push(`Subtotal: ${formatCOP(subtotal)}`);
    parts.push(`Domicilio: ${formatCOP(deliveryFee)}`);
  }
  const total = subtotal + deliveryFee;
  parts.push(`*TOTAL: ${formatCOP(total)}*`);

  // Pago y notas cierran el mensaje, separados del total por una línea en
  // blanco. El pago no puede ir antes: el cambio se calcula sobre el total.
  const tail = [
    paymentLine(customer, total),
    customer.notes.trim() ? `*Notas:* ${customer.notes.trim()}` : null,
  ].filter((line) => line !== null);

  if (tail.length > 0) parts.push("", ...tail);

  return parts.join("\n");
}

/** URL final de wa.me con el pedido ya codificado. */
export function buildOrderUrl(
  items: CartItem[],
  customer: CustomerInfo,
  deliveryFee = 0,
  code?: string | null,
): string {
  return whatsappLink(buildOrderMessage(items, customer, deliveryFee, code));
}
