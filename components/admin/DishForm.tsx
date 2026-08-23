"use client";

import { AlertCircle, ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { createDish, updateDish, type DishInput } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/utils/supabase/client";
import type { Dish } from "@/types/dish";

const BUCKET = "menu-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Props = {
  open: boolean;
  dish: Dish | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * El cuerpo vive dentro del Modal, que no renderiza nada cuando está cerrado.
 * Con la `key` por plato, abrir el formulario monta un componente nuevo y los
 * campos se inicializan solos — sin resetear estado desde un efecto.
 */
export function DishForm({ open, dish, onClose, onSaved }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dish ? "Editar plato" : "Nuevo plato"}
    >
      <DishFormBody
        key={dish?.id ?? "nuevo"}
        dish={dish}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

type FormState = {
  name: string;
  description: string;
  price: string;
  category: string;
  is_available: boolean;
};

function initialState(dish: Dish | null): FormState {
  return dish
    ? {
        name: dish.name,
        description: dish.description ?? "",
        price: String(dish.price),
        category: dish.category,
        is_available: dish.is_available,
      }
    : {
        name: "",
        description: "",
        price: "",
        category: "Platos Fuertes",
        is_available: true,
      };
}

function DishFormBody({
  dish,
  onClose,
  onSaved,
}: Omit<Props, "open">) {
  const [form, setForm] = useState<FormState>(() => initialState(dish));
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(
    dish?.image_url ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Las URLs de objeto hay que liberarlas o se filtra memoria.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!selected.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      event.target.value = "";
      return;
    }
    if (selected.size > MAX_IMAGE_BYTES) {
      setError("La imagen no puede pesar más de 5 MB.");
      event.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setCurrentImage(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  /**
   * La imagen se sube desde el navegador (no por Server Action) porque el
   * cuerpo de una Server Action está limitado a ~1 MB y una foto lo supera.
   */
  async function uploadImage(selected: File): Promise<string> {
    const supabase = createClient();
    const extension = selected.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, selected, {
        cacheControl: "3600",
        upsert: false,
        contentType: selected.type,
      });

    if (uploadError) {
      throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const imageUrl = file ? await uploadImage(file) : currentImage;

      const payload: DishInput = {
        name: form.name,
        description: form.description,
        price: Number(form.price.replace(/[^\d.,-]/g, "").replace(",", ".")),
        category: form.category,
        image_url: imageUrl,
        is_available: form.is_available,
      };

      const result = dish
        ? await updateDish(dish.id, payload)
        : await createDish(payload);

      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ocurrió un error al guardar.",
      );
    } finally {
      setSaving(false);
    }
  }

  const shownImage = previewUrl ?? currentImage;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre"
        required
        placeholder="Arroz de Camarón"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
      />

      <Textarea
        label="Descripción"
        rows={3}
        placeholder="Arroz colorado con camarones frescos y especias de la región."
        value={form.description}
        onChange={(event) =>
          setForm({ ...form, description: event.target.value })
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Precio (COP)"
          required
          type="number"
          min={0}
          step={500}
          inputMode="numeric"
          placeholder="35000"
          value={form.price}
          onChange={(event) => setForm({ ...form, price: event.target.value })}
        />
        <Input
          label="Categoría"
          required
          list="categorias-platos"
          placeholder="Platos Fuertes"
          value={form.category}
          onChange={(event) =>
            setForm({ ...form, category: event.target.value })
          }
        />
        <datalist id="categorias-platos">
          <option value="Platos Fuertes" />
          <option value="Entradas" />
          <option value="Sopas" />
          <option value="Bebidas" />
          <option value="Postres" />
        </datalist>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-dark/80">
          Foto del plato
        </span>

        {shownImage ? (
          <div className="relative h-40 w-full overflow-hidden rounded-lg border border-dark/10">
            <Image
              src={shownImage}
              alt="Vista previa"
              fill
              sizes="(min-width: 640px) 480px, 100vw"
              className="object-cover"
              unoptimized={Boolean(previewUrl)}
            />
            <button
              type="button"
              aria-label="Quitar imagen"
              onClick={clearImage}
              className="absolute right-2 top-2 rounded-full bg-dark/70 p-1.5 text-white transition-colors hover:bg-dark"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label
            htmlFor="dish-image"
            className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-dark/15 text-dark/45 transition-colors hover:border-primary hover:text-primary"
          >
            <ImagePlus size={28} />
            <span className="text-sm font-semibold">
              Haz clic para elegir una imagen
            </span>
            <span className="text-xs">JPG o PNG, máximo 5 MB</span>
          </label>
        )}

        <input
          id="dish-image"
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mt-2 block w-full text-sm text-dark/60 file:mr-3 file:rounded-lg file:border-0 file:bg-dark/5 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-dark hover:file:bg-dark/10"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={form.is_available}
          onChange={(event) =>
            setForm({ ...form, is_available: event.target.checked })
          }
          className="h-4 w-4 accent-primary"
        />
        <span className="text-sm font-semibold text-dark/80">
          Disponible en la carta
        </span>
      </label>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-dark/10 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Guardando…" : dish ? "Guardar cambios" : "Crear plato"}
        </Button>
      </div>
    </form>
  );
}
