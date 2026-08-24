/**
 * Código corto que identifica el pedido. Va en la fila de `orders` y también
 * dentro del mensaje de WhatsApp: es lo único que le permite al dueño saber
 * que ese mensaje salió de la página y encontrarlo en el panel.
 *
 * El alfabeto omite 0/O/1/I/L para que se pueda dictar por teléfono sin
 * confusiones. 5 caracteres sobre 31 símbolos son ~28 millones de
 * combinaciones: de sobra para un restaurante. El `% ALPHABET.length` sesga
 * levemente hacia los primeros símbolos, y da igual: aquí no se busca unicidad
 * criptográfica sino un identificador legible.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 5;

export function orderCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return `MC-${code}`;
}
