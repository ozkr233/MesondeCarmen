import { formatCOP } from "@/lib/format";
import { sumItems } from "@/store/cart";
import type { CartItem } from "@/types/dish";

/** Número del restaurante en formato internacional sin `+` ni separadores. */
export const WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573137604265"
).replace(/\D/g, "");

export type CustomerInfo = {
  name: string;
  phone: string;
  address: string;
  notes: string;
};

/** Enlace de chat suelto, para los botones de "Pedir ahora" del sitio. */
export function whatsappLink(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const DEFAULT_GREETING =
  "Hola, vi su publicidad en internet. ¿Aún tienen comida disponible para envío?";

/**
 * Arma el pedido completo. WhatsApp interpreta *texto* como negrita.
 */
export function buildOrderMessage(
  items: CartItem[],
  customer: CustomerInfo,
): string {
  const lines = items.map(
    (item) =>
      `• ${item.quantity} x ${item.name} — ${formatCOP(item.price * item.quantity)}`,
  );

  const parts = [
    "*NUEVO PEDIDO — El Mesón de Carmen*",
    "",
    `*Cliente:* ${customer.name}`,
    `*Teléfono:* ${customer.phone}`,
    `*Dirección:* ${customer.address}`,
    "",
    "*Pedido:*",
    ...lines,
    "",
    `*TOTAL: ${formatCOP(sumItems(items))}*`,
  ];

  if (customer.notes.trim()) {
    parts.push("", `*Notas:* ${customer.notes.trim()}`);
  }

  return parts.join("\n");
}

/** URL final de wa.me con el pedido ya codificado. */
export function buildOrderUrl(
  items: CartItem[],
  customer: CustomerInfo,
): string {
  return whatsappLink(buildOrderMessage(items, customer));
}
