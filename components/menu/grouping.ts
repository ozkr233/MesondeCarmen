import { compareCategories } from "@/lib/site";
import type { Dish } from "@/types/dish";

// Marcas diacríticas que deja `normalize("NFD")`. Se construye desde string
// para que el rango quede visible en el fuente y no como caracteres sueltos.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Minúsculas sin tildes. Sirve para el slug de las anclas y para que el
 * buscador del panel encuentre "Camarón" escribiendo "camaron".
 */
export function stripDiacritics(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

/** Ancla estable para los enlaces de CategoryNav ("Platos Fuertes" → "platos-fuertes"). */
export function categorySlug(category: string): string {
  return stripDiacritics(category)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Agrupa los platos por categoría respetando el orden de la carta. */
export function groupByCategory(dishes: Dish[]): [string, Dish[]][] {
  const groups = new Map<string, Dish[]>();

  for (const dish of dishes) {
    const key = dish.category?.trim() || "General";
    const current = groups.get(key);
    if (current) current.push(dish);
    else groups.set(key, [dish]);
  }

  return [...groups.entries()].sort(([a], [b]) => compareCategories(a, b));
}
