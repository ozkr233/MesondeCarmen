export const ORDER_STATUSES = [
  "pendiente",
  "confirmado",
  "entregado",
  "cancelado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

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

/** Resumen que alimenta las tarjetas del dashboard. */
export type OrderStats = {
  today: number;
  week: number;
  month: number;
  total: number;
  /** Ingresos de los pedidos del mes que no están cancelados. */
  monthRevenue: number;
  /** Ticket promedio del mes, sin contar cancelados. */
  averageTicket: number;
  pending: number;
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
