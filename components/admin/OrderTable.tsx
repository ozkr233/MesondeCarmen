import { ChevronDown, Phone, ShoppingBag } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { formatCOP, formatDateTimeCO } from "@/lib/format";
import { STATUS_LABELS, type Order, type OrderStatus } from "@/types/order";

/**
 * Listado de pedidos del panel.
 *
 * Es un Server Component: el detalle se despliega con `<details>` nativo, así
 * que no hace falta estado ni mandar JavaScript por una tabla que solo se lee.
 * El estado se muestra como etiqueta; todavía no se puede cambiar desde aquí.
 */

const STATUS_STYLES: Record<OrderStatus, string> = {
  pendiente: "bg-secondary/25 text-dark",
  confirmado: "bg-blue-100 text-blue-800",
  entregado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-700",
};

export function OrderTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <ShoppingBag size={40} className="text-dark/15" />
        <p className="font-semibold text-dark/60">Todavía no hay pedidos</p>
        <p className="max-w-md text-sm text-dark/45">
          Aquí aparece cada pedido que sale de la página. Los que lleguen por
          WhatsApp sin pasar por el sitio no se registran.
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-dark/5 overflow-hidden">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </Card>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-colors hover:bg-light [&::-webkit-details-marker]:hidden">
        <ChevronDown
          size={16}
          className="shrink-0 text-dark/30 transition-transform group-open:rotate-180"
        />

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-primary">
              {order.code}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                STATUS_STYLES[order.status]
              }`}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </p>
          <p className="truncate text-sm text-dark/60">
            {order.customer_name} · {formatDateTimeCO(order.created_at)}
          </p>
        </div>

        <span className="ml-auto shrink-0 text-lg font-black text-dark">
          {formatCOP(order.total)}
        </span>
      </summary>

      <div className="space-y-4 border-t border-dark/5 bg-light/60 p-4 pl-10 text-sm">
        <div>
          <Label>Platos</Label>
          {order.order_items.length === 0 ? (
            <p className="text-dark/45">
              Este pedido se guardó sin detalle. El mensaje de WhatsApp sí lo
              tiene completo.
            </p>
          ) : (
            <ul className="space-y-1">
              {order.order_items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-4 text-dark/70"
                >
                  <span>
                    {item.quantity} x {item.name}
                  </span>
                  <span className="shrink-0 font-semibold text-dark">
                    {formatCOP(item.unit_price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Teléfono</Label>
            <a
              href={`tel:${order.customer_phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 font-semibold text-whatsapp-dark hover:underline"
            >
              <Phone size={14} /> {order.customer_phone}
            </a>
          </div>
          <div>
            <Label>Dirección</Label>
            <p className="text-dark/70">{order.customer_address}</p>
          </div>
        </dl>

        {order.notes && (
          <div>
            <Label>Notas</Label>
            <p className="text-dark/70">{order.notes}</p>
          </div>
        )}

        <div className="border-t border-dark/10 pt-3 text-dark/60">
          Subtotal {formatCOP(order.subtotal)} · Domicilio{" "}
          {formatCOP(order.delivery_fee)}
        </div>
      </div>
    </details>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-dark/40">
      {children}
    </p>
  );
}
