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

/** Sin tildes, en minúsculas y con guiones: "Platos Fuertes" → "platos-fuertes". */
export function slugify(text: string): string {
  return stripDiacritics(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Ancla estable para los enlaces de CategoryNav ("Platos Fuertes" → "platos-fuertes"). */
export function categorySlug(category: string): string {
  return slugify(category);
}

/**
 * Identificador del plato para los enlaces que se comparten
 * ("Arroz de Camarón" → "arroz-de-camaron"). Se deriva del nombre, así que
 * renombrar el plato invalida sus enlaces: `lib/deeplink.ts` acepta también el
 * uuid como respaldo permanente.
 */
export function dishSlug(name: string): string {
  return slugify(name);
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
