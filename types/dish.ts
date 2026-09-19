import { normalizePortions, type Portion } from "@/lib/portions";

export type Dish = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  /** Si se pide por porción. Aparte de la lista: apagarlo no borra los precios. */
  has_portions: boolean;
  /** Los tamaños y sus precios, ordenados de menor a mayor. */
  portions: Portion[];
  /** Posición en la portada. 0 = sin ordenar; desempata `created_at`. */
  featured_order: number;
  created_at: string;
};

/** Lo que se guarda en el carrito: los datos mínimos para armar el pedido. */
export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  /**
   * Las porciones que ofrecía el plato al agregarlo. El cajón del carrito no
   * consulta `dishes`, así que sin esta copia no podría pintar el selector.
   * Vacía = este plato no se pide por porción.
   */
  portions: Portion[];
  /** Las personas de la porción elegida. null si el plato no tiene porciones. */
  portion: number | null;
};

/** Ajustes del negocio editables desde /admin. */
export type Settings = {
  deliveryFee: number;
};

/**
 * PostgREST puede devolver las columnas `numeric` como string según la
 * precisión, así que el precio se normaliza a número en un solo sitio.
 *
 * `has_portions` y `portions` se sanean aquí mismo porque llegan `undefined` en
 * una base donde todavía no se corrió `09_porciones.sql`: así un despliegue
 * adelantado deja la función apagada en vez de romper la carta.
 */
export function normalizeDish(row: Dish): Dish {
  return {
    ...row,
    price: Number(row.price) || 0,
    has_portions: row.has_portions === true,
    portions: normalizePortions(row.portions),
    featured_order: Number(row.featured_order) || 0,
  };
}
