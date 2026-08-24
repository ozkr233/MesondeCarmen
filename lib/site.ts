/**
 * Datos del negocio en un solo sitio. Editar aquí evita tocar los componentes.
 */
export const site = {
  name: "El Mesón de Carmen",
  tagline: "El verdadero sabor de La Guajira.",
  city: "Riohacha, La Guajira",
  phoneDisplay: "+57 313 760 4265",
  address: "[Calle / Carrera exacta], Riohacha, La Guajira.",
  hours: [
    "Lunes a Sábado: 11:00 AM - 9:00 PM",
    "Domingo: 11:00 AM - 5:00 PM",
  ],
  mapsEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31456.00497498467!2d-72.93083591977537!3d11.54444270000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef3e3d9b5e2b5c7%3A0x2e6a8f4e8e8e8e8e!2sRiohacha%2C%20La%20Guajira!5e0!3m2!1ses!2sco!4v1700000000000!5m2!1ses!2sco",
  /** Foto de portada. Reemplázala por una propia cuando la tengas. */
  heroImage:
    "https://z-cdn-media.chatglm.cn/files/618438aa-692a-41ff-aa52-46821d36a49d.jpeg?auth_key=1885199246-fe9d77de764141fabf8ae1c90e3e5f4a-0-0becbdcf641017680cd84cf9bf071961",
} as const;

/**
 * Orden en que se muestran las categorías en la carta. Sin esto se ordenarían
 * alfabéticamente y las bebidas saldrían antes que los platos fuertes.
 * Las categorías que no estén aquí van al final, en orden alfabético.
 */
export const CATEGORY_ORDER = [
  "Entradas",
  "Sopas",
  "Arroces",
  "Asados",
  "Guisados",
  "Fritos",
  "Especialidades Guajiras",
  "Platos Fuertes",
  "Bebidas",
  "Postres",
] as const;

export function compareCategories(a: string, b: string): number {
  const indexA = CATEGORY_ORDER.indexOf(a as (typeof CATEGORY_ORDER)[number]);
  const indexB = CATEGORY_ORDER.indexOf(b as (typeof CATEGORY_ORDER)[number]);

  // -1 (no listada) pasa a ser la última posición.
  const rankA = indexA === -1 ? CATEGORY_ORDER.length : indexA;
  const rankB = indexB === -1 ? CATEGORY_ORDER.length : indexB;

  return rankA - rankB || a.localeCompare(b, "es");
}
