/**
 * Porciones: un plato puede venderse en varios tamaños ("para 2 personas",
 * "para 4 personas"), y cada uno cuesta lo que el dueño escriba en /admin.
 * Aquí no se calcula ningún precio a partir de otro — el de cada porción es
 * un dato suyo, no una fórmula.
 *
 * Vive aparte y sin importar `store/cart` por el mismo motivo que
 * `lib/validation.ts`: la Server Action que registra el pedido usa estas
 * funciones y no debe arrastrar zustand al bundle del servidor. Los platos se
 * describen de forma estructural, así que `Dish` y `CartItem` encajan solos
 * sin que este módulo importe `types/dish.ts` — que sí importa de aquí.
 */

export type Portion = {
  /** Para cuántas personas rinde. Es la clave: no se repite dentro de un plato. */
  people: number;
  /** Lo que cuesta esa porción, en pesos. No se deriva del precio del plato. */
  price: number;
};

/** Tope de porciones por plato. El mismo que el CHECK `dishes_portions_shape`. */
export const MAX_PORTIONS = 8;

/** Tope de personas por porción. El mismo que `order_items_portion_valid`. */
export const MAX_PEOPLE = 20;

/**
 * Lo mínimo que hace falta saber de un plato para resolver su porción. `Dish`
 * y las filas que lee `saveOrder` encajan sin declararlo.
 */
type PortionedDish = {
  price: number;
  has_portions: boolean;
  portions: Portion[];
};

function toPeople(value: unknown): number | null {
  const people = Number(value);
  if (!Number.isInteger(people)) return null;
  return people >= 1 && people <= MAX_PEOPLE ? people : null;
}

function toPrice(value: unknown): number | null {
  // `Number("")` y `Number(null)` son 0, que aquí es un precio legítimo: se
  // descartan antes para que un campo vacío no se convierta en un plato gratis.
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;

  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

/**
 * Sanea la columna `jsonb`, que llega tal cual de PostgREST y puede venir de
 * una fila escrita a mano en el dashboard. Descarta lo que no tenga forma de
 * porción, deja una sola entrada por número de personas y las ordena de menor
 * a mayor, que es como se muestran en todas partes.
 */
export function normalizePortions(raw: unknown): Portion[] {
  if (!Array.isArray(raw)) return [];

  const byPeople = new Map<number, number>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;

    const people = toPeople((entry as Partial<Portion>).people);
    const price = toPrice((entry as Partial<Portion>).price);
    if (people === null || price === null) continue;

    // Con la porción repetida gana la primera, para que el precio no dependa
    // del orden en que Postgres devuelva el array.
    if (!byPeople.has(people)) byPeople.set(people, price);
  }

  return [...byPeople]
    .sort(([a], [b]) => a - b)
    .slice(0, MAX_PORTIONS)
    .map(([people, price]) => ({ people, price }));
}

/**
 * Las porciones que de verdad se ofrecen. El interruptor se guarda aparte de la
 * lista para poder apagar la función sin perder los precios escritos, así que
 * "tiene porciones" es exactamente esto y no se comprueba en ningún otro sitio.
 */
export function dishPortions(dish: PortionedDish): Portion[] {
  return dish.has_portions ? dish.portions : [];
}

/** La porción de N personas dentro de una lista, o null si ya no está. */
export function findPortion(
  portions: Portion[],
  people: number | null,
): Portion | null {
  if (people === null) return null;
  return portions.find((portion) => portion.people === people) ?? null;
}

/** La más barata de la lista. Es el respaldo y lo que anuncia el "Desde". */
function cheapest(portions: Portion[]): Portion | null {
  return portions.reduce<Portion | null>(
    (lowest, portion) =>
      !lowest || portion.price < lowest.price ? portion : lowest,
    null,
  );
}

/**
 * La porción con la que se cobra un pedido, resuelta contra el plato de la
 * base. `null` significa que se cobra el precio normal del plato.
 *
 * Que el cliente pida una porción que ya no existe es posible: el dueño pudo
 * borrarla entre que se abrió WhatsApp y se registró el pedido. Se cae a la más
 * barata en vez de a la primera, para no cobrar de más por un cambio que la
 * persona no vio.
 */
export function resolvePortion(
  dish: PortionedDish,
  requested: number | null,
): Portion | null {
  const portions = dishPortions(dish);
  if (portions.length === 0) return null;
  return findPortion(portions, requested) ?? cheapest(portions);
}

/** "1 persona" · "3 personas". */
export function peopleLabel(people: number): string {
  return `${people} ${people === 1 ? "persona" : "personas"}`;
}

/** "para 3 personas". Lo que se añade al nombre del plato. */
export function portionLabel(people: number): string {
  return `para ${peopleLabel(people)}`;
}

/**
 * El precio que se anuncia en la carta. Con varias porciones es el de la más
 * barata y `from` pide que se pinte un "Desde" delante; con una sola no hay
 * rango que anunciar, así que se muestra a secas.
 */
export function menuPrice(dish: PortionedDish): {
  amount: number;
  from: boolean;
} {
  const portions = dishPortions(dish);
  const lowest = cheapest(portions);

  if (!lowest) return { amount: dish.price, from: false };
  return { amount: lowest.price, from: portions.length > 1 };
}

/**
 * Revisa la lista que se acaba de escribir en /admin. Devuelve el mensaje que
 * se le muestra al dueño, o null si puede guardarse. Una lista vacía es válida:
 * significa que el plato se sigue pidiendo a su precio normal.
 */
export function validatePortions(portions: Portion[]): string | null {
  if (portions.length > MAX_PORTIONS) {
    return `No se pueden definir más de ${MAX_PORTIONS} porciones por plato.`;
  }

  const seen = new Set<number>();

  for (const { people, price } of portions) {
    if (!Number.isInteger(people) || people < 1 || people > MAX_PEOPLE) {
      return `Las personas de cada porción deben ser un número entero entre 1 y ${MAX_PEOPLE}.`;
    }
    if (!Number.isFinite(price) || price < 0) {
      return "Cada porción necesita un precio mayor o igual a cero.";
    }
    if (seen.has(people)) {
      return `Hay dos porciones para ${peopleLabel(people)}. Deja solo una.`;
    }
    seen.add(people);
  }

  return null;
}
