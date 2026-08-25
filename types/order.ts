/**
 * Los valores que admite la columna `status` de `orders`, que existe con un
 * CHECK en la base y nace siempre en `pendiente`.
 *
 * El panel no los muestra ni los cambia a propósito: cada pedido que sale de
 * la página cuenta igual, y llevar estados al día sería trabajo diario para el
 * dueño. El tipo se queda porque la columna sigue ahí y se lee en las
 * consultas; el día que haga falta gestionarlos, este es el sitio.
 */
export const ORDER_STATUSES = [
  "pendiente",
  "confirmado",
  "entregado",
  "cancelado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderItem = {
  id: string;
  dish_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
};

export type Order = {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  order_items: OrderItem[];
};

/**
 * Resumen que alimenta las tarjetas del dashboard.
 *
 * Todas las cifras cuentan cada pedido que salió de la página, sin filtrar por
 * estado: mientras nadie los administre, filtrar solo escondería ventas.
 */
export type OrderStats = {
  today: number;
  week: number;
  month: number;
  total: number;
  /** Ingresos de los pedidos de los últimos 30 días. */
  monthRevenue: number;
  /** Ticket promedio de los últimos 30 días. */
  averageTicket: number;
  /** Platos más pedidos en los últimos 30 días. */
  topDishes: { name: string; quantity: number }[];
};

/**
 * PostgREST devuelve `numeric` como número o string según la precisión, así
 * que se normaliza en un solo sitio, igual que se hace con los platos.
 */
export function normalizeOrder(row: Order): Order {
  return {
    ...row,
    subtotal: Number(row.subtotal) || 0,
    delivery_fee: Number(row.delivery_fee) || 0,
    total: Number(row.total) || 0,
    order_items: (row.order_items ?? []).map((item) => ({
      ...item,
      unit_price: Number(item.unit_price) || 0,
      quantity: Number(item.quantity) || 0,
    })),
  };
}
