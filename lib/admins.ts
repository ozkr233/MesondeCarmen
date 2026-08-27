import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Lectura de quién administra el negocio.
 *
 * `admins` no tiene ninguna política de RLS y `auth.users` no se expone por
 * PostgREST, así que esto solo se puede leer con la llave secreta. Por eso cada
 * función comprueba primero que quien pregunta sea administrador: aquí no hay
 * un RLS detrás que rescate un descuido.
 */

export type TeamMember = {
  userId: string;
  email: string;
  /** Etiqueta que escribió quien lo dio de alta. No decide permisos. */
  note: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

/**
 * ¿La sesión de esta petición está en `admins`?
 *
 * Se pregunta con el cliente de sesión, no con el de la llave secreta: lo que
 * interesa es el veredicto sobre *quien navega*, y `is_admin()` lo deduce del
 * token que viaja en la petición.
 */
export async function currentUserIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");

  if (error) {
    // Lo más probable es que falte ejecutar supabase/07_rls_solo_admin.sql.
    console.error("[equipo] is_admin:", error.message);
    return false;
  }
  return data === true;
}

/** El id de quien navega, para no dejar que se revoque a sí mismo. */
export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

/**
 * El equipo, con el correo de cada uno. Devuelve vacío para quien no sea
 * administrador, igual que el resto de lecturas del panel: ninguna lanza, para
 * que un problema de red no tumbe la página entera.
 */
export async function listAdmins(): Promise<TeamMember[]> {
  if (!(await currentUserIsAdmin())) return [];

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[equipo] llave secreta:", error);
    return [];
  }

  const { data: rows, error } = await admin
    .from("admins")
    .select("user_id, note, created_at")
    .order("created_at");

  if (error) {
    console.error("[equipo] admins:", error.message);
    return [];
  }

  // El correo vive en `auth.users`, que no se puede cruzar con un join de
  // PostgREST: hay que pedirlo por la API de administración, uno a uno. Son un
  // puñado de filas, así que no compensa complicarlo.
  const members = await Promise.all(
    (rows ?? []).map(async (row): Promise<TeamMember | null> => {
      const { data, error: userError } = await admin.auth.admin.getUserById(
        row.user_id as string,
      );

      // La cuenta debería existir siempre por la clave foránea, pero si no
      // está, mejor omitirla que pintar una fila rota.
      if (userError || !data?.user) return null;

      return {
        userId: row.user_id as string,
        email: data.user.email ?? "(sin correo)",
        note: (row.note as string | null) ?? null,
        createdAt: row.created_at as string,
        lastSignInAt: data.user.last_sign_in_at ?? null,
      };
    }),
  );

  return members.filter((member): member is TeamMember => member !== null);
}
