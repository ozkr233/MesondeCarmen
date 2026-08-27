"use server";

import { revalidatePath } from "next/cache";

import { currentUserIsAdmin } from "@/lib/admins";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Alta y baja de administradores.
 *
 * Estas acciones son distintas de las de `actions.ts` en un punto que importa:
 * escriben con la llave secreta, porque crear cuentas y tocar `admins` no se
 * puede hacer de otra forma. Eso significa que **RLS no las protege**, y la
 * comprobación de `assertAdmin()` no es una segunda barrera como en el resto
 * del panel: es la única que hay. Una Server Action es un endpoint público al
 * que se puede llamar sin pasar por la interfaz.
 */

export type ActionResult = { error: string | null };

export type NewAdminInput = {
  email: string;
  password: string;
  note: string;
};

/** Supabase acepta 6 por defecto; para una cuenta de administración es poco. */
const MIN_PASSWORD = 8;
const MAX_NOTE = 80;

/** Suficiente para atrapar un dedazo; validar correos de verdad es imposible. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Cuántas páginas de usuarios se recorren buscando un correo. */
const MAX_PAGES = 10;
const PER_PAGE = 200;

/** Devuelve el motivo del rechazo, o null si puede seguir. */
async function assertAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return "Tu sesión expiró. Vuelve a entrar.";

  return (await currentUserIsAdmin())
    ? null
    : "No tienes permiso para gestionar el equipo.";
}

/**
 * Busca una cuenta ya existente por correo.
 *
 * La API de administración no permite consultar por email, así que toca
 * recorrer páginas. Solo se llega aquí al dar de alta a alguien, y este
 * proyecto no tiene más usuarios que los del propio panel.
 */
async function findUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error || !data) return null;

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );
    if (found) return found.id;
    if (data.users.length < PER_PAGE) return null;
  }
  return null;
}

function translateCreateError(message: string): string {
  if (/already been registered|already exists/i.test(message)) {
    return "Ya existe una cuenta con ese correo.";
  }
  // Con la protección de contraseñas filtradas activada, Supabase rechaza
  // también las que aparecen en brechas conocidas, no solo las cortas.
  if (/pwned|breach|compromis|weak/i.test(message)) {
    return "Esa contraseña aparece en filtraciones conocidas. Elige otra.";
  }
  if (/password/i.test(message)) {
    return "Supabase rechazó la contraseña. Prueba con otra más larga.";
  }
  return message;
}

/**
 * Crea la cuenta y le da permisos, en un solo paso.
 *
 * Si la persona ya tenía cuenta (por ejemplo porque se creó a mano en el
 * dashboard) no se crea otra: se le dan permisos a la que ya existe y la
 * contraseña escrita aquí se ignora, para no cambiársela sin querer.
 */
export async function createAdmin(
  input: NewAdminInput,
): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const email = input.email.trim().toLowerCase();
  const note = input.note.trim();

  if (!EMAIL_PATTERN.test(email)) return { error: "El correo no es válido." };
  if (input.password.length < MIN_PASSWORD) {
    return {
      error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
    };
  }
  if (note.length > MAX_NOTE) {
    return { error: `La nota no puede pasar de ${MAX_NOTE} caracteres.` };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("[equipo] llave secreta:", error);
    return { error: "Falta la llave secreta de Supabase en el servidor." };
  }

  let userId = await findUserIdByEmail(admin, email);

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      // Sin esto la persona no podría entrar hasta abrir el correo de
      // confirmación, y el proyecto no tiene la autoconfirmación activada.
      email_confirm: true,
    });

    if (error || !data?.user) {
      const message = error?.message ?? "No se pudo crear la cuenta.";
      console.error("[equipo] createUser:", message);
      return { error: translateCreateError(message) };
    }
    userId = data.user.id;
  }

  // `upsert` y no `insert`: volver a dar de alta a alguien que ya estaba solo
  // debe actualizar su nota, no reventar con un error de clave duplicada.
  const { error: grantError } = await admin
    .from("admins")
    .upsert({ user_id: userId, note: note || null }, { onConflict: "user_id" });

  if (grantError) {
    console.error("[equipo] alta:", grantError.message);
    return { error: "La cuenta se creó, pero no se le pudieron dar permisos." };
  }

  revalidatePath("/admin/equipo");
  return { error: null };
}

/**
 * Quita los permisos, sin borrar la cuenta.
 *
 * Se separan a propósito: revocar es reversible y basta para cerrar el acceso
 * al panel. Borrar la cuenta de verdad se hace desde el dashboard, que es donde
 * corresponde una acción que no tiene vuelta atrás.
 */
export async function revokeAdmin(userId: string): Promise<ActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  if (typeof userId !== "string" || !userId.trim()) {
    return { error: "La selección no es válida." };
  }

  // Quitarse a uno mismo suele ser un clic por error, y si eres el único deja
  // el panel sin nadie dentro: para eso habría que volver al editor SQL.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub === userId) {
    return { error: "No puedes quitarte los permisos a ti mismo." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("admins").delete().eq("user_id", userId);

  if (error) {
    console.error("[equipo] baja:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/equipo");
  return { error: null };
}
