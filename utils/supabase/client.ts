import { createBrowserClient } from "@supabase/ssr";

import { supabaseConfig } from "./env";

/**
 * Cliente para Client Components: login, logout y subida de imágenes al bucket.
 * `createBrowserClient` ya devuelve un singleton internamente.
 */
export function createClient() {
  const [url, key] = supabaseConfig();
  return createBrowserClient(url, key);
}
