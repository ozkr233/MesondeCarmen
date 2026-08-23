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
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
