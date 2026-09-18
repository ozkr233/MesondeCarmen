import { dishSlug } from "@/components/menu/grouping";
import { site } from "@/lib/site";
import type { Dish } from "@/types/dish";

/**
 * Enlaces para compartir un plato: al abrirlos, la página lo agrega al carrito
 * y despliega el cajón del pedido. El servidor resuelve el plato y
 * `components/cart/CartDeepLink.tsx` hace el resto en el cliente.
 */

/** Nombre del parámetro en la URL: `/carta?plato=sancocho-de-gallina`. */
export const DEEPLINK_PARAM = "plato";

/** Ruta a la que apuntan los enlaces copiados desde el panel. */
const DEEPLINK_PATH = "/carta";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Busca el plato al que apunta un enlace. Acepta el slug del nombre —lo que se
 * comparte— o el uuid, que sigue funcionando aunque el plato se renombre.
 *
 * Devuelve null si no hay coincidencia; el enlace entonces no hace nada y la
 * página carga normal.
 */
export function resolveDishRef(dishes: Dish[], ref: string): Dish | null {
  const needle = ref.trim();
  if (!needle) return null;

  if (UUID.test(needle)) {
    // Postgres devuelve los uuid en minúsculas, pero copiarlos de otro sitio
    // puede traerlos en mayúsculas.
    const id = needle.toLowerCase();
    return dishes.find((dish) => dish.id.toLowerCase() === id) ?? null;
  }

  const slug = dishSlug(needle);
  if (!slug) return null;

  // Nada impide dos platos con el mismo nombre. Gana el más antiguo en vez del
  // primero que devuelva Supabase, para que el enlace no cambie de plato entre
  // una visita y otra.
  let match: Dish | null = null;
  for (const dish of dishes) {
    if (dishSlug(dish.name) !== slug) continue;
    if (!match || dish.created_at < match.created_at) match = dish;
  }
  return match;
}

/** Normaliza el valor crudo del parámetro, que puede venir repetido en la URL. */
export function deepLinkRef(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || null;
}

/** Enlace absoluto listo para pegar en WhatsApp o Instagram. */
export function dishDeepLink(dish: Dish, path: string = DEEPLINK_PATH): string {
  const url = new URL(path, site.url);
  url.searchParams.set(DEEPLINK_PARAM, dishSlug(dish.name));
  return url.toString();
}
