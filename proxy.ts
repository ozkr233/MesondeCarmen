import type { NextRequest } from "next/server";

import { updateSession } from "@/utils/supabase/proxy";

/**
 * Next 16 renombró `middleware.ts` a `proxy.ts`. Corre en runtime Node.js.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas menos:
     * - _next/static y _next/image (assets generados)
     * - favicon y archivos de imagen del directorio public
     * - sitemap.xml y robots.txt: son públicos y no tienen sesión que
     *   refrescar; pasar por aquí era una consulta a Supabase por cada
     *   visita de un buscador.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
