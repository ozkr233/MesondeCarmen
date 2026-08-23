/**
 * Credenciales públicas de Supabase.
 *
 * Se leen como literales `process.env.X` (y no dinámicamente) porque Next solo
 * sustituye las variables NEXT_PUBLIC_* en el bundle del navegador cuando
 * aparecen escritas de forma literal.
 *
 * Supabase renombró la llave `anon` (JWT) a `publishable` (sb_publishable_...).
 * Se aceptan las dos para que la app funcione con proyectos nuevos y antiguos.
 */
const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_ENV =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * La comprobación se hace al crear el cliente, no al importar el módulo: así
 * un `.env.local` incompleto da un error claro en la petición en lugar de
 * tumbar el build entero.
 */
export function supabaseConfig(): [url: string, key: string] {
  if (!URL_ENV || !KEY_ENV) {
    throw new Error(
      "Faltan las variables de entorno de Supabase. Copia .env.example a .env.local " +
        "y rellena NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return [URL_ENV, KEY_ENV];
}
