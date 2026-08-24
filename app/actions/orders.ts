"use server";

import { orderCode } from "@/lib/order-code";
import { getSettings } from "@/lib/queries";
import { createClient } from "@/utils/supabase/server";

/**
 * Guarda el pedido que el visitante acaba de enviar por WhatsApp.
 *
 * A diferencia de las acciones de /admin, esta es pública: no hay sesión que
 * validar. La barrera es que nada de lo que manda el navegador se toma como
 * cierto — solo los ids de los platos y las cantidades. Nombres y precios se
 * vuelven a leer de `dishes`, así que un carrito manipulado en localStorage no
 * puede ensuciar las estadísticas del panel.
 */

/** Lo mínimo que el cliente necesita mandar: qué plato y cuántos. */
export type OrderLineInput = {
  id: string;
  quantity: number;
};

export type OrderInput = {
  items: OrderLineInput[];
  name: string;
  phone: string;
  address: string;
  notes: string;
};

export type SaveOrderResult = {
  code: string | null;
  error: string | null;
};

const MAX_LINES = 50;
const MAX_QUANTITY = 99;

function validate(input: OrderInput): string | null {
  if (input.items.length === 0) return "El pedido no tiene platos.";
  if (input.items.length > MAX_LINES) return "El pedido tiene demasiados platos.";
  if (!input.name.trim()) return "El nombre es obligatorio.";
  if (!input.phone.trim()) return "El teléfono es obligatorio.";
  if (!input.address.trim()) return "La dirección es obligatoria.";

  for (const line of input.items) {
    if (!line.id) return "Hay un plato sin identificar en el pedido.";
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      return "Las cantidades del pedido no son válidas.";
    }
    if (line.quantity > MAX_QUANTITY) {
      return `No se pueden pedir más de ${MAX_QUANTITY} unidades de un plato.`;
    }
  }
  return null;
}

export async function saveOrder(input: OrderInput): Promise<SaveOrderResult> {
  const invalid = validate(input);
  if (invalid) return { code: null, error: invalid };

  const supabase = await createClient();

  // Los precios se releen de la base: el carrito vive en localStorage y llega
  // manipulable. Si no, las cifras del panel no significarían nada.
  const ids = [...new Set(input.items.map((line) => line.id))];
  const { data: dishes, error: dishesError } = await supabase
    .from("dishes")
    .select("id, name, price")
    .in("id", ids);

  if (dishesError) {
    console.error("[orders] platos:", dishesError.message);
    return { code: null, error: "No se pudo verificar el pedido." };
  }

  const byId = new Map(
    (dishes ?? []).map((dish) => [
      dish.id as string,
      { name: dish.name as string, price: Number(dish.price) || 0 },
    ]),
  );

  // Un plato borrado entre que se agregó al carrito y se envió el pedido se
  // ignora: el mensaje de WhatsApp ya salió con él y el dueño lo aclara ahí.
  const lines = input.items.flatMap((line) => {
    const dish = byId.get(line.id);
    if (!dish) return [];
    return [
      {
        dish_id: line.id,
        name: dish.name,
        unit_price: dish.price,
        quantity: line.quantity,
      },
    ];
  });

  if (lines.length === 0) {
    return { code: null, error: "Ninguno de los platos del pedido existe ya." };
  }

  const subtotal = lines.reduce(
    (total, line) => total + line.unit_price * line.quantity,
    0,
  );
  const { deliveryFee } = await getSettings();
  const code = orderCode();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      code,
      customer_name: input.name.trim(),
      customer_phone: input.phone.trim(),
      customer_address: input.address.trim(),
      notes: input.notes.trim() || null,
      subtotal,
      delivery_fee: deliveryFee,
    })
    .select("id, code")
    .single();

  if (orderError || !order) {
    console.error("[orders] insert:", orderError?.message);
    return { code: null, error: "No se pudo registrar el pedido." };
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(lines.map((line) => ({ ...line, order_id: order.id as string })));

  // Si las líneas fallan, el pedido ya quedó guardado con su total: se registra
  // el fallo y se devuelve el código igual. Vale más un pedido sin detalle en
  // el panel que perder el rastro de una venta.
  if (itemsError) console.error("[orders] items:", itemsError.message);

  return { code: order.code as string, error: null };
}
