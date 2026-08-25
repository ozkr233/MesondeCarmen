/**
 * Reglas del formulario de pedido, compartidas por el navegador y el servidor.
 *
 * Vive aparte de `lib/whatsapp.ts` a propósito: aquel importa `store/cart` y
 * arrastraría zustand al bundle del servidor solo por reutilizar un tipo. Aquí
 * el cliente se describe de forma estructural y `CustomerInfo` encaja solo.
 */

type CustomerFields = {
  name: string;
  phone: string;
  address: string;
  notes: string;
  /** Uno de `PAYMENT_METHODS`, o "" mientras no se haya elegido. */
  payment: string;
  /** Billete de `CASH_OPTIONS` como texto. Solo aplica al pagar en efectivo. */
  cashBill: string;
};

/**
 * Formas de pago que acepta el restaurante.
 *
 * En minúscula y sin tildes porque este es el valor que viaja al CHECK de
 * `payment_method` en Postgres; lo que lee el cliente sale de `PAYMENT_LABELS`.
 * Cambiar uno de estos literales obliga a una migración, no solo a tocar aquí.
 */
export const PAYMENT_METHODS = ["efectivo", "tarjeta", "nequi"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  nequi: "Nequi",
};

/**
 * Billetes con los que se suele pagar un domicilio. El `0` es "pago con el
 * valor exacto": así el dueño sabe cuándo no tiene que salir con cambio, que es
 * distinto de que el cliente no haya contestado.
 *
 * Lista cerrada a propósito, en vez de un campo de monto libre: el dato llega
 * limpio y el cambio se calcula sin fiarse de lo que se digitó.
 */
export const CASH_OPTIONS = [0, 10000, 20000, 50000, 100000] as const;

function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

function isCashOption(value: string): boolean {
  return (CASH_OPTIONS as readonly number[]).some(
    (option) => String(option) === value,
  );
}

/** Los mismos topes que los CHECK de `orders` en supabase/03_pedidos.sql. */
export const LIMITS = {
  name: 120,
  phone: 40,
  address: 300,
  notes: 500,
} as const;

/** Igual que el CHECK `order_items_quantity_max`. */
export const MAX_QUANTITY = 99;

/** Tope de líneas distintas en un pedido. */
export const MAX_LINES = 50;

/** Por debajo de esto una dirección casi nunca basta para llegar. */
const SHORT_ADDRESS = 12;

/** Un nombre más corto que esto suele ser un dedazo. */
const MIN_NAME = 3;

/**
 * Deja solo los dígitos y quita el indicativo de país.
 * "+57 300 123-4567" → "3001234567"
 *
 * El `57` se quita solo si al hacerlo quedan los 10 dígitos de un celular, para
 * no mutilar un número que empiece por 57 por casualidad.
 */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("57")
    ? digits.slice(2)
    : digits;
}

/**
 * Celular colombiano: 10 dígitos que empiezan por 3.
 *
 * No se comprueba el prefijo contra una lista (300-305, 310-323…) porque los
 * operadores reciben rangos nuevos cada tanto y una lista cerrada acabaría
 * rechazando celulares legítimos.
 */
export function isMobile(digits: string): boolean {
  return /^3\d{9}$/.test(digits);
}

/** "3001234567" → "300 123 4567". Para el mensaje de WhatsApp y el panel. */
export function formatPhoneCO(digits: string): string {
  return isMobile(digits)
    ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : digits;
}

export type FieldName =
  | "name"
  | "phone"
  | "address"
  | "payment"
  | "cashBill";
export type CustomerErrors = Partial<Record<FieldName, string>>;

/** Valida un campo suelto, para poder avisar al salir de él. */
export function validateField(
  field: FieldName,
  customer: CustomerFields,
): string | null {
  switch (field) {
    case "name": {
      const name = customer.name.trim();
      if (!name) return "Escribe tu nombre.";
      if (name.length < MIN_NAME) return "Escribe tu nombre completo.";
      if (name.length > LIMITS.name) return "El nombre es demasiado largo.";
      return null;
    }
    case "phone": {
      if (!customer.phone.trim()) return "Escribe tu número de celular.";
      if (!isMobile(normalizePhone(customer.phone))) {
        return "Un celular colombiano tiene 10 dígitos y empieza por 3.";
      }
      return null;
    }
    case "address": {
      const address = customer.address.trim();
      if (!address) return "Escribe la dirección de entrega.";
      if (address.length > LIMITS.address)
        return "La dirección es demasiado larga.";
      return null;
    }
    case "payment": {
      // Un valor fuera de la lista solo llega si se manipuló el `<select>`; se
      // trata igual que no haber elegido, sin mensaje aparte que lo delate.
      if (!isPaymentMethod(customer.payment)) return "Elige cómo vas a pagar.";
      return null;
    }
    case "cashBill": {
      // El billete solo se pregunta al pagar en efectivo: con tarjeta o Nequi
      // el campo ni se muestra y no puede bloquear el envío.
      if (customer.payment !== "efectivo") return null;
      if (!isCashOption(customer.cashBill)) {
        return "Dinos con cuánto vas a pagar para llevarte el cambio.";
      }
      return null;
    }
  }
}

/** Errores que bloquean el envío. Objeto vacío = se puede enviar. */
export function validateCustomer(customer: CustomerFields): CustomerErrors {
  const errors: CustomerErrors = {};

  for (const field of [
    "name",
    "phone",
    "address",
    "payment",
    "cashBill",
  ] as const) {
    const message = validateField(field, customer);
    if (message) errors[field] = message;
  }
  return errors;
}

/**
 * Aviso que NO bloquea el envío. Una dirección corta suele llegar, pero tarde;
 * se sugiere completarla sin impedir que el pedido salga.
 */
export function addressWarning(address: string): string | null {
  const trimmed = address.trim();
  if (!trimmed || trimmed.length >= SHORT_ADDRESS) return null;
  return "Agrega el barrio y un punto de referencia para que el domicilio llegue.";
}

/** Deja los datos del cliente listos para WhatsApp y para la base. */
export function cleanCustomer(customer: CustomerFields): CustomerFields {
  // El pago se filtra contra las listas cerradas: lo que no esté en ellas sale
  // como "" en vez de viajar tal cual al mensaje o a la base.
  const payment = isPaymentMethod(customer.payment) ? customer.payment : "";

  // El billete solo sobrevive si se paga en efectivo. Sin esto, elegir Efectivo
  // con $50.000 y cambiar después a Nequi dejaría un billete colgado que el
  // formulario ya no muestra pero el mensaje sí contaría.
  const cashBill =
    payment === "efectivo" && isCashOption(customer.cashBill)
      ? customer.cashBill
      : "";

  return {
    name: customer.name.trim().slice(0, LIMITS.name),
    phone: formatPhoneCO(normalizePhone(customer.phone)).slice(0, LIMITS.phone),
    address: customer.address.trim().slice(0, LIMITS.address),
    notes: customer.notes.trim().slice(0, LIMITS.notes),
    payment,
    cashBill,
  };
}

/**
 * El billete como número, para calcular el cambio y para guardarlo.
 *
 * `null` cuando no aplica (no se paga en efectivo o no se eligió billete); `0`
 * cuando el cliente dijo que paga con el valor exacto. Los dos casos se ven
 * igual en un campo de texto vacío, y hay que distinguirlos.
 */
export function parseCashBill(customer: CustomerFields): number | null {
  if (customer.payment !== "efectivo") return null;
  if (!isCashOption(customer.cashBill)) return null;
  return Number(customer.cashBill);
}
