"use client";

import { Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";

import {
  deleteDish,
  toggleAvailability,
  toggleFeatured,
} from "@/app/admin/actions";
import { DishForm } from "@/components/admin/DishForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { formatCOP } from "@/lib/format";
import type { Dish } from "@/types/dish";

type Flag = "is_available" | "is_featured";
type FlagChange = { id: string; field: Flag; value: boolean };

export function DishTable({ dishes }: { dishes: Dish[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Los interruptores responden al instante; si la acción falla, el estado
  // optimista se descarta solo al terminar la transición.
  const [optimisticDishes, applyFlag] = useOptimistic(
    dishes,
    (current, change: FlagChange) =>
      current.map((dish) =>
        dish.id === change.id ? { ...dish, [change.field]: change.value } : dish,
      ),
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(dish: Dish) {
    setEditing(dish);
    setFormOpen(true);
  }

  function handleFlag(dish: Dish, field: Flag, value: boolean) {
    setError(null);
    startTransition(async () => {
      applyFlag({ id: dish.id, field, value });
      const result =
        field === "is_available"
          ? await toggleAvailability(dish.id, value)
          : await toggleFeatured(dish.id, value);

      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete(dish: Dish) {
    if (
      !window.confirm(
        `¿Eliminar "${dish.name}"? Esta acción no se puede deshacer.`,
      )
    )
      return;

    setError(null);
    startTransition(async () => {
      const result = await deleteDish(dish.id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  const featuredCount = optimisticDishes.filter((d) => d.is_featured).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-dark">Platos</h1>
          <p className="text-sm text-dark/50">
            {dishes.length} {dishes.length === 1 ? "plato" : "platos"} ·{" "}
            {featuredCount} en la portada
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
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-dark/10 bg-light/60 text-xs uppercase tracking-wide text-dark/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Plato</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Precio</th>
                <th className="px-4 py-3 text-center font-semibold">
                  Disponible
                </th>
                <th className="px-4 py-3 text-center font-semibold">Portada</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark/5">
              {optimisticDishes.map((dish) => (
                <tr key={dish.id} className="align-middle hover:bg-light/50">
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
                  <td className="px-4 py-3 text-dark/70">{dish.category}</td>
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

      <DishForm
        open={formOpen}
        dish={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />
    </>
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
