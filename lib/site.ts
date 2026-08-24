/**
 * Datos del negocio en un solo sitio. Editar aquí evita tocar los componentes.
 */
export const site = {
  name: "El Mesón de Carmen",
  tagline: "El verdadero sabor de La Guajira.",
  city: "Riohacha, La Guajira",
  phoneDisplay: "+57 313 760 4265",
  address: "Cl. 11 #9-29, Riohacha, La Guajira",
  hours: [
    "Lunes a Sábado: 11:00 AM - 9:00 PM",
    "Domingo: 11:00 AM - 5:00 PM",
  ],
  /** Embed por consulta: no requiere API key y sigue a `address`. */
  mapsEmbedUrl:
    "https://www.google.com/maps?q=Cl.+11+%239-29,+Riohacha,+La+Guajira&output=embed",
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
