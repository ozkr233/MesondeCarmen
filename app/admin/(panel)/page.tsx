import { DishTable } from "@/components/admin/DishTable";
import { createClient } from "@/utils/supabase/server";
import { normalizeDish, type Dish } from "@/types/dish";

export const metadata = { title: "Platos | El Mesón de Carmen" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dishes")
    .select("*")
    .order("category", { ascending: true })
    .order("created_at", { ascending: false });

  const dishes = ((data as Dish[] | null) ?? []).map(normalizeDish);

  return (
    <>
      {error && (
        <p className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los platos: {error.message}
        </p>
      )}
      <DishTable dishes={dishes} />
    </>
  );
}
