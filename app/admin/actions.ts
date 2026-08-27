"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  MENU_IMAGES_BUCKET as BUCKET,
  storagePathFromUrl,
} from "@/lib/storage";
import { createClient } from "@/utils/supabase/server";

export type DishInput = {
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
};

export type ActionResult = { error: string | null };

/** Banderas booleanas que se pueden cambiar en lote desde la tabla. */
export type DishFlag = "is_available" | "is_featured";

const DISH_FLAGS: readonly DishFlag[] = ["is_available", "is_featured"];

/** Tope de una acción en lote. Más que esto no cabe en una pantalla. */
const MAX_BULK = 200;

/**
 * Los docs de Next advierten que el matcher del proxy no cubre de forma fiable
 * las Server Actions, así que cada acción revalida la sesión por su cuenta.
 * La barrera definitiva sigue siendo RLS en Supabase.
 */
async function requireSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/admin/login");
  return supabase;
}

function validate(input: DishInput): string | null {
  if (!input.name.trim()) return "El nombre del plato es obligatorio.";
  if (!input.category.trim()) return "La categoría es obligatoria.";
  if (!Number.isFinite(input.price) || input.price < 0)
    return "El precio debe ser un número mayor o igual a cero.";
  return null;
}

function clean(input: DishInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim() || null,
    price: input.price,
    category: input.category.trim(),
    image_url: input.image_url?.trim() || null,
    is_available: input.is_available,
    is_featured: input.is_featured,
  };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/carta");
  revalidatePath("/admin");
}

export async function createDish(input: DishInput): Promise<ActionResult> {
  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const supabase = await requireSession();
  const { error } = await supabase.from("dishes").insert(clean(input));
  if (error) return { error: error.message };

  refresh();
  return { error: null };
}

export async function updateDish(
  id: string,
  input: DishInput,
): Promise<ActionResult> {
  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const supabase = await requireSession();

  // La foto anterior se lee antes de pisarla: una vez escrita la fila nueva ya
  // no habría forma de saber qué archivo dejó de estar referenciado.
  const { data: previous } = await supabase
    .from("dishes")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();

  const next = clean(input);
  const { error } = await supabase.from("dishes").update(next).eq("id", id);
  if (error) return { error: error.message };

  // Se comparan rutas y no URLs, y solo después de que la escritura haya ido
  // bien: si el update falla, la fila sigue apuntando a la foto vieja. Guardar
  // sin tocar la imagen manda la misma URL, y ahí no hay nada que borrar.
  const oldPath = storagePathFromUrl(previous?.image_url ?? null);
  const newPath = storagePathFromUrl(next.image_url);
  if (oldPath && oldPath !== newPath) {
    // Best effort: si falla, la fila ya se guardó y solo queda un huérfano.
    await supabase.storage.from(BUCKET).remove([oldPath]);
  }

  refresh();
  return { error: null };
}

export async function toggleAvailability(
  id: string,
  isAvailable: boolean,
): Promise<ActionResult> {
  const supabase = await requireSession();
  const { error } = await supabase
    .from("dishes")
    .update({ is_available: isAvailable })
    .eq("id", id);
  if (error) return { error: error.message };

  refresh();
  return { error: null };
}

export async function toggleFeatured(
  id: string,
  isFeatured: boolean,
): Promise<ActionResult> {
  const supabase = await requireSession();
  const { error } = await supabase
    .from("dishes")
    .update({ is_featured: isFeatured })
    .eq("id", id);
  if (error) return { error: error.message };

  refresh();
  return { error: null };
}

/** Tarifa única de domicilio. Vive en la fila id = 1 de `settings`. */
export async function updateDeliveryFee(fee: number): Promise<ActionResult> {
  if (!Number.isFinite(fee) || fee < 0) {
    return { error: "El costo de envío debe ser un número mayor o igual a cero." };
  }

  const supabase = await requireSession();
  const { error } = await supabase
    .from("settings")
    .update({ delivery_fee: fee, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { error: error.message };

  refresh();
  return { error: null };
}

export async function deleteDish(id: string): Promise<ActionResult> {
  const supabase = await requireSession();

  // Se lee la imagen antes de borrar la fila para poder limpiar el bucket.
  const { data: dish } = await supabase
    .from("dishes")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("dishes").delete().eq("id", id);
  if (error) return { error: error.message };

  const path = storagePathFromUrl(dish?.image_url ?? null);
  if (path) {
    // Best effort: si falla, la fila ya se borró y solo queda un huérfano.
    await supabase.storage.from(BUCKET).remove([path]);
  }

  refresh();
  return { error: null };
}

/**
 * Duplica un plato para no rellenar a mano uno casi idéntico.
 *
 * Solo viaja el id: los datos se releen del servidor, siguiendo la regla de
 * los docs de Next de no fiarse del contenido que manda el cliente.
 *
 * La foto se copia a un objeto nuevo en vez de reutilizar la URL. Si las dos
 * filas apuntaran al mismo archivo, borrar la copia dejaría al original sin
 * imagen, porque `deleteDish` limpia el bucket sin contar referencias.
 */
export async function duplicateDish(id: string): Promise<ActionResult> {
  const supabase = await requireSession();

  const { data: dish, error: readError } = await supabase
    .from("dishes")
    .select("name, description, price, category, image_url, is_available")
    .eq("id", id)
    .maybeSingle();

  if (readError) return { error: readError.message };
  if (!dish) return { error: "El plato ya no existe." };

  let imageUrl: string | null = dish.image_url;
  const sourcePath = storagePathFromUrl(dish.image_url);

  if (sourcePath) {
    const extension = sourcePath.split(".").pop() || "jpg";
    const copyPath = `${crypto.randomUUID()}.${extension}`;
    const { error: copyError } = await supabase.storage
      .from(BUCKET)
      .copy(sourcePath, copyPath);

    // Si la copia falla se sigue sin foto: mejor eso que compartir el archivo.
    imageUrl = copyError
      ? null
      : supabase.storage.from(BUCKET).getPublicUrl(copyPath).data.publicUrl;
  }

  const { error } = await supabase.from("dishes").insert({
    name: `${dish.name} (copia)`,
    description: dish.description,
    price: dish.price,
    category: dish.category,
    image_url: imageUrl,
    is_available: dish.is_available,
    // La copia nace fuera de la portada: solo caben tres y ya están elegidos.
    is_featured: false,
  });
  if (error) return { error: error.message };

  refresh();
  return { error: null };
}

/**
 * Los ids llegan del cliente, así que se acotan antes de tocar Supabase. No
 * hace falta comprobar propiedad: los platos son del negocio, no de un
 * usuario, y RLS ya exige sesión para escribir en `dishes`.
 */
function validateIds(ids: string[]): string | null {
  if (!Array.isArray(ids) || ids.length === 0)
    return "No hay ningún plato seleccionado.";
  if (ids.length > MAX_BULK)
    return `No se pueden cambiar más de ${MAX_BULK} platos a la vez.`;
  if (ids.some((id) => typeof id !== "string" || !id.trim()))
    return "La selección no es válida.";
  return null;
}

/** Cambia una bandera en varios platos con una sola escritura. */
export async function bulkSetFlag(
  ids: string[],
  field: DishFlag,
  value: boolean,
): Promise<ActionResult> {
  const invalid = validateIds(ids);
  if (invalid) return { error: invalid };

  // `field` acaba siendo un nombre de columna: solo se aceptan los literales.
  if (!DISH_FLAGS.includes(field)) return { error: "Acción no válida." };

  const supabase = await requireSession();
  const { error } = await supabase
    .from("dishes")
    .update({ [field]: value })
    .in("id", ids);
  if (error) return { error: error.message };

  refresh();
  return { error: null };
}

/** Borra varios platos y, de paso, sus fotos del bucket. */
export async function bulkDeleteDishes(ids: string[]): Promise<ActionResult> {
  const invalid = validateIds(ids);
  if (invalid) return { error: invalid };

  const supabase = await requireSession();

  // Igual que en `deleteDish`: las imágenes se leen antes de borrar las filas.
  const { data: rows } = await supabase
    .from("dishes")
    .select("image_url")
    .in("id", ids);

  const { error } = await supabase.from("dishes").delete().in("id", ids);
  if (error) return { error: error.message };

  const paths = (rows ?? [])
    .map((row) => storagePathFromUrl(row.image_url))
    .filter((path): path is string => path !== null);

  // Best effort y en una sola llamada: si falla, solo quedan huérfanos.
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);

  refresh();
  return { error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/admin");
  redirect("/admin/login");
}
