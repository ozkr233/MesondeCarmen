import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseConfig } from "./env";

/**
 * Cliente para Server Components, Route Handlers y Server Actions.
 *
 * Se crea uno nuevo por petición: las cookies de sesión viven en la petición,
 * no en un singleton compartido entre usuarios.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const [url, key] = supabaseConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Escribir cookies desde un Server Component lanza error por diseño.
          // No pasa nada: el refresco de sesión lo hace el proxy de la raíz.
        }
      },
    },
  });
}
