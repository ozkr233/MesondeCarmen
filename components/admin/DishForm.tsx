"use client";

import { AlertCircle, ImagePlus, Loader2, Plus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { createDish, updateDish, type DishInput } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { DEFAULT_CATEGORY } from "@/lib/categories";
import {
  MAX_PEOPLE,
  MAX_PORTIONS,
  validatePortions,
  type Portion,
} from "@/lib/portions";
import { MENU_IMAGES_BUCKET as BUCKET } from "@/lib/storage";
import { createClient } from "@/utils/supabase/client";
import type { Dish } from "@/types/dish";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Valor centinela del desplegable que abre el campo de categoría nueva. */
const NEW_CATEGORY = "__nueva__";

type Props = {
  open: boolean;
  dish: Dish | null;
  /** Categorías que ofrece el desplegable, en orden de carta. */
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
};

/**
 * El cuerpo vive dentro del Modal, que no renderiza nada cuando está cerrado.
 * Con la `key` por plato, abrir el formulario monta un componente nuevo y los
 * campos se inicializan solos — sin resetear estado desde un efecto.
 */
export function DishForm({ open, dish, categories, onClose, onSaved }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dish ? "Editar plato" : "Nuevo plato"}
    >
      <DishFormBody
        key={dish?.id ?? "nuevo"}
        dish={dish}
        categories={categories}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

/**
 * Una fila del editor de porciones. Los números viven como texto mientras se
 * escriben, igual que el precio del plato: un `<input type="number">` a medio
 * teclear no siempre tiene valor numérico, y borrarlo del todo no debe
 * convertirse en un cero.
 *
 * El `id` no se guarda en ninguna parte: solo da una `key` estable para que
 * quitar una fila del medio no le pase su texto a la de abajo.
 */
type PortionRow = { id: string; people: string; price: string };

type FormState = {
  name: string;
  description: string;
  price: string;
  category: string;
  is_available: boolean;
  is_featured: boolean;
  has_portions: boolean;
  portions: PortionRow[];
};

function portionRows(portions: Portion[]): PortionRow[] {
  return portions.map((portion) => ({
    id: crypto.randomUUID(),
    people: String(portion.people),
    price: String(portion.price),
  }));
}

function initialState(dish: Dish | null): FormState {
  return dish
    ? {
        name: dish.name,
        description: dish.description ?? "",
        price: String(dish.price),
        category: dish.category,
        is_available: dish.is_available,
        is_featured: dish.is_featured,
        has_portions: dish.has_portions,
        portions: portionRows(dish.portions),
      }
    : {
        name: "",
        description: "",
        price: "",
        category: DEFAULT_CATEGORY,
        is_available: true,
        is_featured: false,
        has_portions: false,
        portions: [],
      };
}

/**
 * Lo que se teclea en un campo de dinero o de cantidad, como número. Un campo
 * vacío sale `NaN` a propósito: `Number("")` es 0, y guardar una porción de
 * cero personas o a precio cero por no haberla rellenado sería peor que el
 * mensaje de error que devuelve `validatePortions`.
 */
function toAmount(value: string): number {
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  return cleaned.trim() ? Number(cleaned) : Number.NaN;
}

function DishFormBody({
  dish,
  categories,
  onClose,
  onSaved,
}: Omit<Props, "open">) {
  const [form, setForm] = useState<FormState>(() => initialState(dish));
  const [newCategory, setNewCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(
    dish?.image_url ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Si el plato que se edita trae una categoría que no está en la lista, se
  // añade: el desplegable nunca debe cambiarla en silencio al abrirlo.
  const options =
    dish && dish.category && !categories.includes(dish.category)
      ? [...categories, dish.category]
      : categories;

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

  function updatePortion(id: string, field: "people" | "price", value: string) {
    setForm((current) => ({
      ...current,
      portions: current.portions.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    }));
  }

  function removePortion(id: string) {
    setForm((current) => ({
      ...current,
      portions: current.portions.filter((row) => row.id !== id),
    }));
  }

  /** Arranca en el primer número de personas que no esté ya usado. */
  function addPortion() {
    setForm((current) => {
      if (current.portions.length >= MAX_PORTIONS) return current;

      const used = new Set(current.portions.map((row) => Number(row.people)));
      let people = 1;
      while (people < MAX_PEOPLE && used.has(people)) people += 1;

      return {
        ...current,
        portions: [
          ...current.portions,
          { id: crypto.randomUUID(), people: String(people), price: "" },
        ],
      };
    });
  }

  /**
   * La imagen se sube desde el navegador (no por Server Action) porque el
   * cuerpo de una Server Action está limitado a ~1 MB y una foto lo supera.
   *
   * Devuelve también la ruta dentro del bucket: si el guardado posterior falla,
   * es lo único que permite volver atrás y borrar el archivo recién subido.
   */
  async function uploadImage(
    selected: File,
  ): Promise<{ path: string; publicUrl: string }> {
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
    return { path, publicUrl: data.publicUrl };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const category =
      form.category === NEW_CATEGORY ? newCategory.trim() : form.category;
    if (!category) {
      setError("Escribe el nombre de la categoría nueva.");
      return;
    }

    // Las filas en blanco son las que se añadieron y nunca se llenaron: se
    // descartan sin avisar. Con el interruptor apagado se descartan también las
    // incompletas, porque el editor no está a la vista y un error sobre una
    // fila que no se ve no habría manera de arreglarlo.
    const portions = form.portions
      .map((row) => ({
        people: toAmount(row.people),
        price: toAmount(row.price),
      }))
      .filter(({ people, price }) =>
        form.has_portions
          ? !(Number.isNaN(people) && Number.isNaN(price))
          : !Number.isNaN(people) && !Number.isNaN(price),
      );

    // La acción vuelve a validarlas por su cuenta; hacerlo aquí ahorra el viaje
    // y evita que un campo vacío llegue al servidor como NaN.
    if (form.has_portions) {
      const invalidPortions = validatePortions(portions);
      if (invalidPortions) {
        setError(invalidPortions);
        return;
      }
    }

    setSaving(true);
    setError(null);

    // La subida y el guardado son dos escrituras distintas: si la primera va
    // bien y la segunda no, el archivo se queda en el bucket sin ninguna fila
    // que lo referencie. Se anota aquí para poder deshacerla.
    let uploadedPath: string | null = null;

    try {
      let imageUrl = currentImage;
      if (file) {
        const uploaded = await uploadImage(file);
        uploadedPath = uploaded.path;
        imageUrl = uploaded.publicUrl;
      }

      const payload: DishInput = {
        name: form.name,
        description: form.description,
        price: Number(form.price.replace(/[^\d.,-]/g, "").replace(",", ".")),
        category,
        image_url: imageUrl,
        is_available: form.is_available,
        is_featured: form.is_featured,
        has_portions: form.has_portions,
        // Se mandan encendido o no: apagar el interruptor esconde las porciones
        // de la carta, pero no debe borrar los precios ya escritos.
        portions,
      };

      const result = dish
        ? await updateDish(dish.id, payload)
        : await createDish(payload);

      if (result.error) {
        setError(result.error);
        return;
      }

      // La fila ya apunta al archivo: deja de ser un huérfano en potencia.
      uploadedPath = null;
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ocurrió un error al guardar.",
      );
    } finally {
      if (uploadedPath) {
        // Best effort y sin propagar: el error que le importa al usuario ya
        // está en pantalla, y el RLS del bucket deja borrar a `authenticated`.
        await createClient()
          .storage.from(BUCKET)
          .remove([uploadedPath])
          .catch(() => {});
      }
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
        <Select
          label="Categoría"
          required
          value={form.category}
          onChange={(event) =>
            setForm({ ...form, category: event.target.value })
          }
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value={NEW_CATEGORY}>Otra categoría…</option>
        </Select>
      </div>

      {form.category === NEW_CATEGORY && (
        <Input
          label="Nueva categoría"
          required
          autoFocus
          placeholder="Mariscos"
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
        />
      )}

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

      <div className="space-y-2.5">
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

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(event) =>
              setForm({ ...form, is_featured: event.target.checked })
            }
            className="h-4 w-4 accent-secondary"
          />
          <span className="text-sm font-semibold text-dark/80">
            Destacado en la portada
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.has_portions}
            onChange={(event) =>
              setForm({ ...form, has_portions: event.target.checked })
            }
            className="h-4 w-4 accent-primary"
          />
          <span className="text-sm font-semibold text-dark/80">
            Permite elegir porción
          </span>
        </label>
      </div>

      {/* El editor se esconde con el interruptor, pero los precios no se
          borran: volver a encenderlo los devuelve tal cual estaban. */}
      {form.has_portions && (
        <div className="rounded-lg border border-dark/10 bg-light/60 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-dark/80">
              Porciones y precios
            </span>
            <span className="text-xs tabular-nums text-dark/45">
              {form.portions.length}/{MAX_PORTIONS}
            </span>
          </div>

          {form.portions.length === 0 ? (
            <p className="mt-2 text-xs text-dark/55">
              Sin porciones, el plato se pide a su precio normal. Añade una para
              venderlo por tamaños.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {/* Los anchos viven en estos contenedores y no en los campos:
                  `fieldBase` ya trae `w-full` y `cn()` solo concatena, así que
                  un `w-24` en el propio input no gana — decidiría el orden del
                  CSS generado. Cada `Input` llena el hueco que le toca. */}
              <div className="flex items-center gap-2 text-xs font-semibold text-dark/50">
                <span className="w-24 shrink-0">Personas</span>
                <span className="min-w-0 flex-1">Precio (COP)</span>
                <span className="w-8 shrink-0" aria-hidden />
              </div>

              {form.portions.map((row, index) => (
                <div key={row.id} className="flex items-center gap-2">
                  <div className="w-24 shrink-0">
                    <Input
                      type="number"
                      min={1}
                      max={MAX_PEOPLE}
                      inputMode="numeric"
                      aria-label={`Personas de la porción ${index + 1}`}
                      value={row.people}
                      onChange={(event) =>
                        updatePortion(row.id, "people", event.target.value)
                      }
                      className="px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Input
                      type="number"
                      min={0}
                      step={500}
                      inputMode="numeric"
                      placeholder="30000"
                      aria-label={`Precio de la porción ${index + 1}`}
                      value={row.price}
                      onChange={(event) =>
                        updatePortion(row.id, "price", event.target.value)
                      }
                      className="px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePortion(row.id)}
                    aria-label={`Quitar la porción ${index + 1}`}
                    className="w-8 shrink-0 rounded-lg p-1.5 text-dark/35 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPortion}
            disabled={form.portions.length >= MAX_PORTIONS}
            className="mt-3"
          >
            <Plus size={14} /> Añadir porción
          </Button>
        </div>
      )}

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
