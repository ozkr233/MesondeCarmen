"use server";

import { isOrderCode } from "@/lib/order-code";
import { getSettings } from "@/lib/queries";
import {
  cleanCustomer,
  MAX_LINES,
  MAX_QUANTITY,
  validateCustomer,
} from "@/lib/validation";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Guarda el pedido que el visitante acaba de enviar por WhatsApp.
 *
 * A diferencia de las acciones de /admin, esta es pública: no hay sesión que
 * validar. La barrera es que nada de lo que manda el navegador se toma como
 * cierto — solo los ids de los platos, las cantidades y el código. Nombres y
 * precios se vuelven a leer de `dishes`, así que un carrito manipulado en
 * localStorage no puede ensuciar las estadísticas del panel.
 *
 * Las escrituras van con la llave secreta (`createAdminClient`), porque
 * `orders` y `order_items` ya no aceptan inserts de `anon`: este es el único
 * camino que queda para registrar un pedido, y las reglas de arriba dejan de
 * ser una convención del formulario para ser la única puerta que existe.
 *
 * Aun así se escribe sin pedir la fila de vuelta. Un `.select()` encadenado al
 * insert obliga a Postgres a devolver la fila recién creada, y eso ata la
 * escritura a una política de lectura que no hace ninguna falta aquí.
 */

/** Lo mínimo que el cliente necesita mandar: qué plato y cuántos. */
export type OrderLineInput = {
  id: string;
  quantity: number;
};

export type OrderInput = {
  items: OrderLineInput[];
  /** El mismo que ya viaja en el mensaje de WhatsApp. Se valida, no se cree. */
  code: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
};

export type SaveOrderResult = {
  code: string | null;
  error: string | null;
};

function validate(input: OrderInput): string | null {
  if (input.items.length === 0) return "El pedido no tiene platos.";
  if (input.items.length > MAX_LINES) return "El pedido tiene demasiados platos.";
  if (!isOrderCode(input.code)) return "El código del pedido no es válido.";

  // Las mismas reglas que ve el formulario, incluidas las longitudes. Sin esto
  // un campo largo pasaba de aquí y moría en el CHECK de Postgres, que solo
  // sabe devolver un error genérico.
  const invalid = Object.values(validateCustomer(input))[0];
  if (invalid) return invalid;

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

  // La lectura de la carta va con la clave pública: `dishes` es público y no
  // hace falta más privilegio del imprescindible para consultarlo.
  //
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

  // A partir de aquí se escribe, y escribir pedidos es privilegio del servidor.
  // Si falta la llave se registra y se devuelve error en vez de lanzar: el
  // mensaje de WhatsApp ya salió y el checkout no debe romperse por esto.
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[orders] llave secreta:", error);
    return { code: null, error: "No se pudo registrar el pedido." };
  }

  // El id se genera aquí en vez de dejárselo al `default gen_random_uuid()` de
  // la tabla: así se conoce sin tener que leer la fila insertada.
  const id = crypto.randomUUID();

  // Mismo recorte y misma normalización de teléfono que aplica el formulario,
  // por si el pedido llega por otro camino.
  const customer = cleanCustomer(input);

  const { error: orderError } = await admin.from("orders").insert({
    id,
    code: input.code,
    customer_name: customer.name,
    customer_phone: customer.phone,
    customer_address: customer.address,
    notes: customer.notes || null,
    subtotal,
    delivery_fee: deliveryFee,
  });

  if (orderError) {
    console.error("[orders] insert:", orderError.message);
    return { code: null, error: "No se pudo registrar el pedido." };
  }

  const { error: itemsError } = await admin
    .from("order_items")
    .insert(lines.map((line) => ({ ...line, order_id: id })));

  // Si las líneas fallan, el pedido ya quedó guardado con su total: se registra
  // el fallo y se devuelve el código igual. Vale más un pedido sin detalle en
  // el panel que perder el rastro de una venta.
  if (itemsError) console.error("[orders] items:", itemsError.message);

  return { code: input.code, error: null };
}
