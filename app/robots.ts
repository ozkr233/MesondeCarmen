import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El panel ya exige login; esto evita además que sus URLs aparezcan
      // en los resultados de búsqueda.
      disallow: ["/admin", "/admin/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
