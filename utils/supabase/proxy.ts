import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseConfig } from "./env";

const LOGIN_PATH = "/admin/login";

/**
 * Refresca el token de sesión en cada petición y protege /admin.
 *
 * Reglas del patrón oficial de @supabase/ssr que NO hay que romper:
 *  - las cookies nuevas se escriben tanto en `request` (para los Server
 *    Components de esta misma petición) como en `response` (para el navegador);
 *  - hay que devolver el `supabaseResponse` tal cual, sin construir otro
 *    NextResponse, o la sesión se pierde de forma intermitente.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const [supabaseUrl, supabaseKey] = supabaseConfig();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        // Cabeceras anti-caché que envía la propia librería: sin ellas un CDN
        // podría servirle la sesión de un usuario a otro.
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  // No metas código entre createServerClient y getClaims(): si el refresco de
  // token termina después de generar la respuesta, la sesión nueva se pierde.
  let isLoggedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    isLoggedIn = Boolean(data?.claims);
  } catch {
    // Si Supabase no responde, el sitio público sigue en pie y /admin queda
    // cerrado (fail closed) en vez de devolver un 500 en todas las rutas.
    isLoggedIn = false;
  }

  const { pathname } = request.nextUrl;
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginPage = pathname === LOGIN_PATH;

  if (isAdminArea && !isLoginPage && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = "";
    if (pathname !== "/admin") url.searchParams.set("redirect", pathname);
    return redirectKeepingCookies(url, supabaseResponse);
  }

  if (isLoginPage && isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return redirectKeepingCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}

/**
 * Un redirect descarta el cuerpo y las cookies del response original, así que
 * hay que arrastrar las cookies recién refrescadas o el usuario entraría en un
 * bucle de login.
 */
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
