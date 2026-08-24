import { Flame, Receipt, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { formatCOP } from "@/lib/format";
import type { OrderStats } from "@/types/order";

/**
 * Resumen de arriba del panel de pedidos.
 *
 * No hay tarjeta de "pendientes": mientras no exista el cambio de estado,
 * todos los pedidos se quedan en `pendiente` y ese número sería idéntico al
 * total. `stats.pending` se sigue calculando para cuando los estados lleguen.
 */
export function OrderStatsCards({ stats }: { stats: OrderStats }) {
  return (
    <section className="mb-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pedidos hoy" value={String(stats.today)} highlight />
        <Stat label="Últimos 7 días" value={String(stats.week)} />
        <Stat label="Últimos 30 días" value={String(stats.month)} />
        <Stat label="Total histórico" value={String(stats.total)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Ingresos de los últimos 30 días"
          value={formatCOP(stats.monthRevenue)}
          hint="Sin contar los pedidos cancelados."
          icon={<TrendingUp size={18} className="text-primary" />}
        />
        <Stat
          label="Ticket promedio"
          value={formatCOP(stats.averageTicket)}
          hint="Promedio por pedido en los últimos 30 días."
          icon={<Receipt size={18} className="text-primary" />}
        />
      </div>

      {stats.topDishes.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-dark">
            <Flame size={18} className="text-primary" />
            Lo más pedido en 30 días
          </h2>
          <ol className="space-y-1.5">
            {stats.topDishes.map((dish, index) => (
              <li
                key={dish.name}
                className="flex items-baseline justify-between gap-4 text-sm"
              >
                <span className="text-dark/70">
                  <span className="mr-2 font-bold text-dark/35">
                    {index + 1}.
                  </span>
                  {dish.name}
                </span>
                <span className="shrink-0 font-bold text-dark">
                  {dish.quantity}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-dark/50">
        {icon}
        {label}
      </p>
      <p
        className={`mt-1 text-3xl font-black ${
          highlight ? "text-primary" : "text-dark"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-dark/40">{hint}</p>}
    </Card>
  );
}
