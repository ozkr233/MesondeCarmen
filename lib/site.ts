/**
 * Datos del negocio en un solo sitio. Editar aquí evita tocar los componentes.
 */
export const site = {
  name: "El Mesón de Carmen",
  tagline: "El verdadero sabor de La Guajira.",
  city: "Riohacha, La Guajira",
  /** Dominio de producción. Es el que se registró en Google Search Console. */
  url: "https://mesondecarmen.com",
  /**
   * El teléfono del negocio, y la única copia que hay. Cambiar estas dos líneas
   * cambia a la vez lo que se ve en la web, lo que Google publica y a dónde
   * escriben los botones de WhatsApp (`lib/whatsapp.ts` lo deriva de aquí).
   */
  phoneDisplay: "+57 300 554 6977",
  /** El mismo teléfono en formato internacional: schema.org no acepta otro. */
  phoneE164: "+573005546977",
  address: "Cl. 11 #9-29, Riohacha, La Guajira",
  /** `address` despiezado para el `PostalAddress` de los datos estructurados. */
  addressParts: {
    street: "Cl. 11 #9-29",
    locality: "Riohacha",
    region: "La Guajira",
    country: "CO",
  },
  hours: [
    "Lunes a Sábado: 11:00 AM - 9:00 PM",
    "Domingo: 11:00 AM - 5:00 PM",
  ],
  /**
   * Los mismos horarios que `hours`, en el formato que entiende Google.
   * Si cambia uno hay que cambiar el otro: `hours` es lo que lee la persona.
   */
  openingHours: [
    {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "11:00",
      closes: "21:00",
    },
    { days: ["Sunday"], opens: "11:00", closes: "17:00" },
  ],
  servesCuisine: ["Comida guajira", "Comida colombiana", "Comida típica"],
  /** Rango de precios en la escala de Google ($ a $$$$). */
  priceRange: "$$",
  /**
   * Perfiles oficiales del negocio (Google Business, Instagram, Facebook).
   * Añadirlos aquí ayuda a Google a confirmar que la web y la ficha del
   * negocio son lo mismo.
   */
  sameAs: [] as string[],
  /** Coordenadas del local. Pesan en las búsquedas "cerca de mí". */
  geo: { lat: 11.547495522157005, lng: -72.90956307067347 },
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
