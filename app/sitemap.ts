import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

/**
 * Las dos páginas públicas del sitio. La lista va a mano y no sale de Supabase
 * a propósito: el cliente de servidor usa cookies(), lo que volvería el sitemap
 * dinámico y lo dejaría a merced de que la base responda. Para dos URLs no
 * compensa el riesgo de que un fallo de red deje a Google sin sitemap.
 *
 * `/admin` no aparece: es privado y además está bloqueado en robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/carta"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
