import { FunnelCard } from "@/components/admin/FunnelCard";
import { OrderStatsCards } from "@/components/admin/OrderStatsCards";
import { OrderTable } from "@/components/admin/OrderTable";
import { getFunnelStats, getOrders, getOrderStats } from "@/lib/orders";

export const metadata = { title: "Pedidos | El Mesón de Carmen" };

export default async function AdminOrdersPage() {
  const [orders, stats, funnel] = await Promise.all([
    getOrders(),
    getOrderStats(),
    getFunnelStats(),
  ]);

  return (
    <>
      <OrderStatsCards stats={stats} />
      <FunnelCard stats={funnel} />
      <OrderTable orders={orders} />
    </>
  );
}
