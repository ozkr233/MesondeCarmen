import { OrderStatsCards } from "@/components/admin/OrderStatsCards";
import { OrderTable } from "@/components/admin/OrderTable";
import { getOrders, getOrderStats } from "@/lib/orders";

export const metadata = { title: "Pedidos | El Mesón de Carmen" };

export default async function AdminOrdersPage() {
  const [orders, stats] = await Promise.all([getOrders(), getOrderStats()]);

  return (
    <>
      <OrderStatsCards stats={stats} />
      <OrderTable orders={orders} />
    </>
  );
}
