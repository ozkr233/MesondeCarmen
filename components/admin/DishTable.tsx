"use client";

import { Eye, EyeOff, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DishForm } from "@/components/admin/DishForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { deleteDish, toggleAvailability } from "@/app/admin/actions";
import { formatCOP } from "@/lib/format";
import type { Dish } from "@/types/dish";

export function DishTable({ dishes }: { dishes: Dish[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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

  function handleToggle(dish: Dish) {
    setError(null);
    startTransition(async () => {
      const result = await toggleAvailability(dish.id, !dish.is_available);
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

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-dark">Platos</h1>
          <p className="text-sm text-dark/50">
            {dishes.length} {dishes.length === 1 ? "plato" : "platos"} en la
            carta
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} /> Nuevo plato
        </Button>
      </div>

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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-dark/10 bg-light/60 text-xs uppercase tracking-wide text-dark/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Plato</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Precio</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark/5">
              {dishes.map((dish) => (
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
                    <span
                      className={
                        dish.is_available
                          ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800"
                          : "rounded-full bg-dark/10 px-2.5 py-1 text-xs font-bold text-dark/50"
                      }
                    >
                      {dish.is_available ? "Disponible" : "Agotado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconAction
                        label={
                          dish.is_available
                            ? `Marcar ${dish.name} como agotado`
                            : `Marcar ${dish.name} como disponible`
                        }
                        onClick={() => handleToggle(dish)}
                        disabled={pending}
                      >
                        {dish.is_available ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}
                      </IconAction>
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
