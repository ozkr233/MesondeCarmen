import { CATEGORY_ORDER, compareCategories } from "@/lib/site";
import type { Dish } from "@/types/dish";

/**
 * Las categorías no viven en una tabla: la lista buena es `CATEGORY_ORDER`,
 * que además fija el orden de la carta. Aquí se le suman las que ya estén
 * escritas en los platos, para que una categoría creada a mano siga
 * apareciendo en el desplegable en vez de perderse.
 */

/** Categoría que trae un plato nuevo. La primera de la carta. */
export const DEFAULT_CATEGORY: string = CATEGORY_ORDER[0];

/** `CATEGORY_ORDER` ∪ las categorías presentes, en orden de carta. */
export function categoryOptions(dishes: Dish[]): string[] {
  const names = new Set<string>(CATEGORY_ORDER);

  for (const dish of dishes) {
    const name = dish.category?.trim();
    if (name) names.add(name);
  }

  return [...names].sort(compareCategories);
}
