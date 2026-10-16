import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * Sin ISR no hace falta una caché con escritura (R2 o KV). La portada y la
 * carta son dinámicas: se renderizan en cada visita. Lo único prerenderizado
 * en el build (`/admin/login`, `robots.txt`, `sitemap.xml`, los iconos) se
 * sirve desde los assets del propio Worker, que es de solo lectura.
 *
 * Los `revalidatePath` de las acciones del panel apuntan a esas rutas
 * dinámicas, así que tampoco necesitan una tag cache.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
