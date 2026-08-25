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
};

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

export type FieldName = "name" | "phone" | "address";
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
  }
}

/** Errores que bloquean el envío. Objeto vacío = se puede enviar. */
export function validateCustomer(customer: CustomerFields): CustomerErrors {
  const errors: CustomerErrors = {};

  for (const field of ["name", "phone", "address"] as const) {
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
  return {
    name: customer.name.trim().slice(0, LIMITS.name),
    phone: formatPhoneCO(normalizePhone(customer.phone)).slice(0, LIMITS.phone),
    address: customer.address.trim().slice(0, LIMITS.address),
    notes: customer.notes.trim().slice(0, LIMITS.notes),
  };
}
