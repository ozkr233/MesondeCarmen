import { DeliveryFeeCard } from "@/components/admin/DeliveryFeeCard";
import { DishTable } from "@/components/admin/DishTable";
import { getAllDishes, getSettings } from "@/lib/queries";

export const metadata = { title: "Platos | El Mesón de Carmen" };

export default async function AdminDashboardPage() {
  const [{ dishes, error }, settings] = await Promise.all([
    getAllDishes(),
    getSettings(),
  ]);

  return (
    <>
      {error && (
        <p className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los platos: {error}
        </p>
      )}
      <DeliveryFeeCard deliveryFee={settings.deliveryFee} />
      <DishTable dishes={dishes} />
    </>
  );
}
