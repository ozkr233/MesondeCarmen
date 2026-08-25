import "server-only";

import { normalizeOrder, type Order, type OrderStats } from "@/types/order";
import { createClient } from "@/utils/supabase/server";

/**
 * Lecturas de pedidos para el panel. Mismo trato que `lib/queries.ts`: ninguna
 * lanza, si Supabase falla se registra y se devuelve un valor vacío, para que
 * un problema de red no tumbe la página entera.
 *
 * RLS solo deja leer `orders` a usuarios autenticados, así que estas consultas
 * devuelven vacío para un visitante anónimo aunque alguien las llame de más.
 */

const COLUMNS = "*, order_items(*)";

/** Colombia es UTC-5 todo el año, sin horario de verano. */
const CO_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Ventana larga de las estadísticas, en días. */
const WINDOW_DAYS = 30;

/**
 * Medianoche de Colombia del día en curso, como instante UTC.
 *
 * Sin esto, en Vercel (que corre en UTC) los pedidos hechos después de las
 * 7 p.m. hora local contarían como del día siguiente y el "hoy" del panel
 * saldría mal justo en las horas de más pedidos.
 */
function startOfTodayCO(now: Date = new Date()): number {
  const local = new Date(now.getTime() - CO_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return local.getTime() + CO_OFFSET_MS;
}

/** Los pedidos más recientes, con su detalle. */
export async function getOrders(limit = 100): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[orders] listado:", error.message);
    return [];
  }
  return ((data as Order[] | null) ?? []).map(normalizeOrder);
}

const EMPTY_STATS: OrderStats = {
  today: 0,
  week: 0,
  month: 0,
  total: 0,
  monthRevenue: 0,
  averageTicket: 0,
  topDishes: [],
};

/**
 * Resumen para las tarjetas del panel.
 *
 * Se traen los pedidos de la ventana de 30 días y se agrega en JS en vez de
 * lanzar seis consultas agregadas: son decenas de filas, no millones, y así
 * los cortes de fecha usan la misma hora de Colombia en todos los cálculos.
 *
 * Cuenta todos los pedidos que salieron de la página, sea cual sea su
 * `status`. El panel no ofrece manera de cambiarlo, así que filtrar por estado
 * solo dejaría fuera ventas reales por una etiqueta que nadie toca.
 */
export async function getOrderStats(): Promise<OrderStats> {
  const supabase = await createClient();

  const todayStart = startOfTodayCO();
  const weekStart = todayStart - 6 * DAY_MS;
  const monthStart = todayStart - (WINDOW_DAYS - 1) * DAY_MS;

  const [recent, counted] = await Promise.all([
    supabase
      .from("orders")
      .select(COLUMNS)
      .gte("created_at", new Date(monthStart).toISOString()),
    supabase.from("orders").select("id", { count: "exact", head: true }),
  ]);

  if (recent.error) {
    console.error("[orders] estadísticas:", recent.error.message);
    return EMPTY_STATS;
  }
  if (counted.error) {
    console.error("[orders] total histórico:", counted.error.message);
  }

  const orders = ((recent.data as Order[] | null) ?? []).map(normalizeOrder);
  const stats: OrderStats = { ...EMPTY_STATS, total: counted.count ?? 0 };

  const dishQuantities = new Map<string, number>();

  for (const order of orders) {
    const at = new Date(order.created_at).getTime();

    stats.month += 1;
    if (at >= weekStart) stats.week += 1;
    if (at >= todayStart) stats.today += 1;

    stats.monthRevenue += order.total;
    for (const item of order.order_items) {
      dishQuantities.set(
        item.name,
        (dishQuantities.get(item.name) ?? 0) + item.quantity,
      );
    }
  }

  stats.averageTicket = stats.month
    ? Math.round(stats.monthRevenue / stats.month)
    : 0;

  stats.topDishes = [...dishQuantities]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, "es"))
    .slice(0, 5);

  return stats;
}
