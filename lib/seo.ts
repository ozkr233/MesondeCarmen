import { groupByCategory } from "@/components/menu/grouping";
import { site } from "@/lib/site";
import type { Dish } from "@/types/dish";

/**
 * URL pública del sitio, resuelta en un único lugar para que los metadatos,
 * el sitemap, el robots.txt y el JSON-LD no puedan discrepar entre sí.
 *
 * `site.url` es el dominio real; las dos variables de entorno solo existen
 * para que los deploys de preview de Vercel se anuncien a sí mismos en vez de
 * al dominio de producción.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : site.url)
).replace(/\/$/, "");

/** Convierte una ruta interna ("/carta") en URL absoluta. */
export function absoluteUrl(path = "/"): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Imagen de referencia del negocio: la misma que se comparte en WhatsApp. */
const IMAGE = absoluteUrl("/opengraph-image.png");

/**
 * Ficha del negocio. Es el esquema que alimenta el panel lateral de Google con
 * dirección, teléfono y horarios, así que va en la portada.
 */
export function restaurantSchema() {
  const { addressParts: address } = site;

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": absoluteUrl("/#restaurant"),
    name: site.name,
    description: site.tagline,
    url: siteUrl,
    image: IMAGE,
    logo: absoluteUrl("/logo.png"),
    telephone: site.phoneE164,
    priceRange: site.priceRange,
    servesCuisine: [...site.servesCuisine],
    currenciesAccepted: "COP",
    acceptsReservations: "False",
    hasMenu: absoluteUrl("/carta"),
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.locality,
      addressRegion: address.region,
      addressCountry: address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.lat,
      longitude: site.geo.lng,
    },
    openingHoursSpecification: site.openingHours.map(
      ({ days, opens, closes }) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [...days],
        opens,
        closes,
      }),
    ),
    ...(site.sameAs.length > 0 && { sameAs: site.sameAs }),
  };
}

/** Identifica el sitio como tal (nombre que Google puede usar en resultados). */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: site.name,
    url: siteUrl,
    inLanguage: "es-CO",
    publisher: { "@id": absoluteUrl("/#restaurant") },
  };
}

/**
 * La carta completa como `Menu`, agrupada por las mismas categorías y en el
 * mismo orden en que se ve en pantalla (`groupByCategory` ya aplica
 * CATEGORY_ORDER).
 */
export function menuSchema(dishes: Dish[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": absoluteUrl("/carta#menu"),
    name: `Carta de ${site.name}`,
    url: absoluteUrl("/carta"),
    inLanguage: "es-CO",
    provider: { "@id": absoluteUrl("/#restaurant") },
    hasMenuSection: groupByCategory(dishes).map(([category, items]) => ({
      "@type": "MenuSection",
      name: category,
      hasMenuItem: items.map((dish) => ({
        "@type": "MenuItem",
        name: dish.name,
        ...(dish.description && { description: dish.description }),
        ...(dish.image_url && { image: dish.image_url }),
        offers: {
          "@type": "Offer",
          price: dish.price,
          priceCurrency: "COP",
          availability: "https://schema.org/InStock",
        },
      })),
    })),
  };
}

/** Migas de pan: le dicen a Google la jerarquía Inicio → Carta. */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(({ name, path }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}
