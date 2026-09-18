import "server-only";

import { resolveDishRef } from "@/lib/deeplink";
import { compareCategories } from "@/lib/site";
import { normalizeDish, type Dish, type Settings } from "@/types/dish";
import { createClient } from "@/utils/supabase/server";

/**
 * Consultas de lectura compartidas por `/`, `/carta` y `/admin`.
 * Ninguna lanza: si Supabase falla se registra y se devuelve un valor vacío,
 * para que un problema de red no tumbe la página entera.
 */

const COLUMNS = "*";

/** Ordena por categoría (según CATEGORY_ORDER) y, dentro, por antigüedad. */
function sortForMenu(dishes: Dish[]): Dish[] {
  return [...dishes].sort(
    (a, b) =>
      compareCategories(a.category, b.category) ||
      a.created_at.localeCompare(b.created_at),
  );
}

/** Platos marcados como destacados: los que salen en la portada. */
export async function getFeaturedDishes(limit = 3): Promise<Dish[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dishes")
    .select(COLUMNS)
    .eq("is_available", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[dishes] destacados:", error.message);
    return [];
  }
  return ((data as Dish[] | null) ?? []).map(normalizeDish);
}

/** Toda la carta visible al público, agrupable por categoría. */
export async function getAvailableDishes(): Promise<Dish[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dishes")
    .select(COLUMNS)
    .eq("is_available", true);

  if (error) {
    console.error("[dishes] carta:", error.message);
    return [];
  }
  return sortForMenu(((data as Dish[] | null) ?? []).map(normalizeDish));
}

/**
 * El plato al que apunta un enlace compartido (`/carta?plato=...`). Busca solo
 * entre los disponibles: un enlace a un plato agotado no debe llenar el carrito
 * con algo que no se puede pedir.
 *
 * La carta cabe de sobra en memoria, así que sale más barato traerla y comparar
 * aquí que pedirle a Postgres que normalice nombres sin tildes.
 */
export async function findDishByRef(ref: string): Promise<Dish | null> {
  return resolveDishRef(await getAvailableDishes(), ref);
}

/** Todos los platos, incluidos los agotados. Solo para el panel. */
export async function getAllDishes(): Promise<{
  dishes: Dish[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("dishes").select(COLUMNS);

  if (error) return { dishes: [], error: error.message };
  return {
    dishes: sortForMenu(((data as Dish[] | null) ?? []).map(normalizeDish)),
    error: null,
  };
}

/** Ajustes del negocio. Si algo falla, el envío vale 0 y el pedido sigue. */
export async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("delivery_fee")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[settings]:", error.message);
    return { deliveryFee: 0 };
  }
  return { deliveryFee: Number(data?.delivery_fee) || 0 };
}
