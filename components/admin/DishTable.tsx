"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";

import {
  bulkDeleteDishes,
  bulkSetFlag,
  deleteDish,
  duplicateDish,
  toggleAvailability,
  toggleFeatured,
  type DishFlag,
} from "@/app/admin/actions";
import { DishForm } from "@/components/admin/DishForm";
import { stripDiacritics } from "@/components/menu/grouping";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { categoryOptions } from "@/lib/categories";
import { formatCOP } from "@/lib/format";
import { compareCategories } from "@/lib/site";
import type { Dish } from "@/types/dish";

type FlagChange = { ids: string[]; field: DishFlag; value: boolean };

/** Filtros de sí/no que comparten las columnas de banderas. */
type TriState = "todos" | "si" | "no";

type SortKey = "name" | "category" | "price";
/** `null` = orden de la carta, el que ya trae el servidor. */
type Sort = { key: SortKey; dir: "asc" | "desc" } | null;

const ALL = "__todas__";

export function DishTable({ dishes }: { dishes: Dish[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Los interruptores responden al instante; si la acción falla, el estado
  // optimista se descarta solo al terminar la transición.
  const [optimisticDishes, applyFlag] = useOptimistic(
    dishes,
    (current, change: FlagChange) =>
      current.map((dish) =>
        change.ids.includes(dish.id)
          ? { ...dish, [change.field]: change.value }
          : dish,
      ),
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [available, setAvailable] = useState<TriState>("todos");
  const [featured, setFeatured] = useState<TriState>("todos");
  const [sort, setSort] = useState<Sort>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const categories = useMemo(() => categoryOptions(dishes), [dishes]);

  const visible = useMemo(() => {
    const needle = stripDiacritics(query.trim());

    const filtered = optimisticDishes.filter((dish) => {
      if (category !== ALL && dish.category !== category) return false;
      if (available !== "todos" && dish.is_available !== (available === "si"))
        return false;
      if (featured !== "todos" && dish.is_featured !== (featured === "si"))
        return false;
      if (!needle) return true;

      return stripDiacritics(`${dish.name} ${dish.description ?? ""}`).includes(
        needle,
      );
    });

    if (!sort) return filtered;

    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "price":
          return (a.price - b.price) * factor;
        case "category":
          return (
            compareCategories(a.category, b.category) * factor ||
            a.name.localeCompare(b.name, "es")
          );
        default:
          return a.name.localeCompare(b.name, "es") * factor;
      }
    });
  }, [optimisticDishes, query, category, available, featured, sort]);

  // Derivar la selección de los platos vivos poda sola los ids ya borrados.
  const selectedIds = useMemo(
    () => optimisticDishes.filter((d) => selected.has(d.id)).map((d) => d.id),
    [optimisticDishes, selected],
  );

  const featuredCount = optimisticDishes.filter((d) => d.is_featured).length;
  const isFiltered =
    query.trim() !== "" ||
    category !== ALL ||
    available !== "todos" ||
    featured !== "todos";

  function clearFilters() {
    setQuery("");
    setCategory(ALL);
    setAvailable("todos");
    setFeatured("todos");
  }

  /** Tres estados por columna: asc → desc → orden de la carta. */
  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: "asc" };
      if (current.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(dish: Dish) {
    setEditing(dish);
    setFormOpen(true);
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /** "Seleccionar todo" solo alcanza a las filas que se están viendo. */
  function toggleSelectAll(checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const dish of visible) {
        if (checked) next.add(dish.id);
        else next.delete(dish.id);
      }
      return next;
    });
  }

  /**
   * Un solo sitio para lanzar acciones: Next despacha las Server Actions de
   * una en una por cliente, así que nada de `Promise.all` con varias.
   */
  function run(
    action: () => Promise<{ error: string | null }>,
    optimistic?: FlagChange,
  ) {
    setError(null);
    startTransition(async () => {
      if (optimistic) applyFlag(optimistic);
      const result = await action();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleFlag(dish: Dish, field: DishFlag, value: boolean) {
    run(
      () =>
        field === "is_available"
          ? toggleAvailability(dish.id, value)
          : toggleFeatured(dish.id, value),
      { ids: [dish.id], field, value },
    );
  }

  function handleDelete(dish: Dish) {
    if (
      !window.confirm(
        `¿Eliminar "${dish.name}"? Esta acción no se puede deshacer.`,
      )
    )
      return;

    run(() => deleteDish(dish.id));
  }

  function handleBulkFlag(field: DishFlag, value: boolean) {
    const ids = selectedIds;
    run(async () => {
      const result = await bulkSetFlag(ids, field, value);
      if (!result.error) setSelected(new Set());
      return result;
    }, { ids, field, value });
  }

  function handleBulkDelete() {
    const ids = selectedIds;
    if (
      !window.confirm(
        `¿Eliminar ${ids.length} ${ids.length === 1 ? "plato" : "platos"}? Esta acción no se puede deshacer.`,
      )
    )
      return;

    run(async () => {
      const result = await bulkDeleteDishes(ids);
      if (!result.error) setSelected(new Set());
      return result;
    });
  }

  const allVisibleSelected =
    visible.length > 0 && visible.every((dish) => selected.has(dish.id));
  const someVisibleSelected =
    !allVisibleSelected && visible.some((dish) => selected.has(dish.id));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-dark">Platos</h1>
          <p className="text-sm text-dark/50">
            {isFiltered
              ? `${visible.length} de ${optimisticDishes.length} platos`
              : `${optimisticDishes.length} ${optimisticDishes.length === 1 ? "plato" : "platos"}`}{" "}
            · {featuredCount} en la portada
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} /> Nuevo plato
        </Button>
      </div>

      {featuredCount > 3 && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Tienes {featuredCount} platos destacados, pero la portada solo muestra
          los 3 más antiguos. Desmarca alguno para elegir cuáles salen.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {dishes.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <UtensilsCrossed size={48} className="text-dark/15" />
          <p className="font-semibold text-dark/60">Todavía no hay platos</p>
          <p className="text-sm text-dark/45">
            Crea el primero y aparecerá en la carta al instante.
          </p>
          <Button onClick={openCreate} className="mt-2">
            <Plus size={18} /> Nuevo plato
          </Button>
        </Card>
      ) : (
        <>
          <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark/35"
              />
              <Input
                type="search"
                aria-label="Buscar plato"
                placeholder="Buscar por nombre o descripción…"
                className="py-2 pl-9 text-sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <Select
              aria-label="Filtrar por categoría"
              className="w-auto min-w-[9rem] py-2 text-sm"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value={ALL}>Todas las categorías</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Filtrar por disponibilidad"
              className="w-auto min-w-[9rem] py-2 text-sm"
              value={available}
              onChange={(event) =>
                setAvailable(event.target.value as TriState)
              }
            >
              <option value="todos">Disponibles y agotados</option>
              <option value="si">Solo disponibles</option>
              <option value="no">Solo agotados</option>
            </Select>

            <Select
              aria-label="Filtrar por portada"
              className="w-auto min-w-[9rem] py-2 text-sm"
              value={featured}
              onChange={(event) => setFeatured(event.target.value as TriState)}
            >
              <option value="todos">Toda la carta</option>
              <option value="si">En la portada</option>
              <option value="no">Fuera de la portada</option>
            </Select>

            {isFiltered && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X size={16} /> Limpiar
              </Button>
            )}
          </Card>

          {selectedIds.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <span className="mr-1 text-sm font-bold text-dark">
                {selectedIds.length}{" "}
                {selectedIds.length === 1 ? "seleccionado" : "seleccionados"}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => handleBulkFlag("is_available", true)}
              >
                Disponible
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => handleBulkFlag("is_available", false)}
              >
                Agotado
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => handleBulkFlag("is_featured", true)}
              >
                A portada
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => handleBulkFlag("is_featured", false)}
              >
                Quitar de portada
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={handleBulkDelete}
              >
                <Trash2 size={16} /> Eliminar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setSelected(new Set())}
              >
                Cancelar
              </Button>
            </div>
          )}

          {visible.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <SearchX size={48} className="text-dark/15" />
              <p className="font-semibold text-dark/60">
                Ningún plato coincide con los filtros
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-2">
                <X size={16} /> Limpiar filtros
              </Button>
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-dark/10 bg-light/60 text-xs uppercase tracking-wide text-dark/50">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        aria-label="Seleccionar todos los platos visibles"
                        checked={allVisibleSelected}
                        ref={(element) => {
                          if (element)
                            element.indeterminate = someVisibleSelected;
                        }}
                        onChange={(event) =>
                          toggleSelectAll(event.target.checked)
                        }
                      />
                    </th>
                    <SortableHeader
                      label="Plato"
                      sortKey="name"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Categoría"
                      sortKey="category"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Precio"
                      sortKey="price"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <th className="px-4 py-3 text-center font-semibold">
                      Disponible
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">
                      Portada
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark/5">
                  {visible.map((dish) => (
                    <tr
                      key={dish.id}
                      className={
                        "align-middle hover:bg-light/50 " +
                        (selected.has(dish.id) ? "bg-primary/5" : "")
                      }
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          aria-label={`Seleccionar ${dish.name}`}
                          checked={selected.has(dish.id)}
                          onChange={() => toggleSelected(dish.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-dark/5">
                            {dish.image_url ? (
                              <Image
                                src={dish.image_url}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center">
                                🍽️
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-dark">{dish.name}</p>
                            {dish.description && (
                              <p className="line-clamp-1 max-w-xs text-xs text-dark/45">
                                {dish.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-dark/70">
                        {dish.category}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-primary">
                        {formatCOP(dish.price)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Switch
                            checked={dish.is_available}
                            disabled={pending}
                            label={
                              dish.is_available
                                ? `Marcar ${dish.name} como agotado`
                                : `Marcar ${dish.name} como disponible`
                            }
                            onChange={(next) =>
                              handleFlag(dish, "is_available", next)
                            }
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Switch
                            tone="gold"
                            checked={dish.is_featured}
                            disabled={pending}
                            label={
                              dish.is_featured
                                ? `Quitar ${dish.name} de la portada`
                                : `Mostrar ${dish.name} en la portada`
                            }
                            onChange={(next) =>
                              handleFlag(dish, "is_featured", next)
                            }
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IconAction
                            label={`Editar ${dish.name}`}
                            onClick={() => openEdit(dish)}
                            disabled={pending}
                          >
                            <Pencil size={16} />
                          </IconAction>
                          <IconAction
                            label={`Duplicar ${dish.name}`}
                            onClick={() => run(() => duplicateDish(dish.id))}
                            disabled={pending}
                          >
                            <Copy size={16} />
                          </IconAction>
                          <IconAction
                            label={`Eliminar ${dish.name}`}
                            onClick={() => handleDelete(dish)}
                            disabled={pending}
                            danger
                          >
                            <Trash2 size={16} />
                          </IconAction>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      <DishForm
        open={formOpen}
        dish={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
}) {
  const active = sort?.key === sortKey ? sort : null;
  const Icon = !active ? ArrowUpDown : active.dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      className="px-4 py-3 font-semibold"
      aria-sort={
        active ? (active.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Ordenar por ${label.toLowerCase()}`}
        className={
          "inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-dark " +
          (active ? "text-dark" : "")
        }
      >
        {label}
        <Icon size={13} aria-hidden className={active ? "" : "opacity-40"} />
      </button>
    </th>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={
        "rounded-lg p-2 transition-colors disabled:opacity-40 " +
        (danger
          ? "text-dark/50 hover:bg-red-50 hover:text-red-600"
          : "text-dark/50 hover:bg-dark/5 hover:text-dark")
      }
    >
      {children}
    </button>
  );
}
