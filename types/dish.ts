export type Dish = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
};

/** Lo que se guarda en el carrito: los datos mínimos para armar el pedido. */
export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

/**
 * PostgREST puede devolver las columnas `numeric` como string según la
 * precisión, así que el precio se normaliza a número en un solo sitio.
 */
export function normalizeDish(row: Dish): Dish {
  return { ...row, price: Number(row.price) || 0 };
}
