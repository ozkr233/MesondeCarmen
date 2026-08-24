"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

const BUCKET = "menu-images";

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
  const { error } = await supabase
    .from("dishes")
    .update(clean(input))
    .eq("id", id);
  if (error) return { error: error.message };

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/admin");
  redirect("/admin/login");
}

/**
 * Extrae la ruta dentro del bucket de una URL pública de Supabase Storage.
 * Devuelve null para imágenes externas, que no nos toca borrar.
 */
function storagePathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}
