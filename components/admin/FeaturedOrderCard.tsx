"use client";

import { ArrowDown, ArrowUp, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Fragment, useOptimistic, useState, useTransition } from "react";

import { moveFeatured, type MoveDirection } from "@/app/admin/actions";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { FEATURED_LIMIT } from "@/lib/site";
import type { Dish } from "@/types/dish";

/**
 * El mismo orden que aplica `getFeaturedDishes` en Postgres. Si cambia uno,
 * cambia el otro: esta tarjeta existe para enseñar la portada tal como se va a
 * ver, y ordenar distinto aquí la convertiría en una mentira.
 */
function byFeaturedOrder(a: Dish, b: Dish): number {
  return (
    a.featured_order - b.featured_order ||
    a.created_at.localeCompare(b.created_at)
  );
}

/** Mueve un elemento de sitio sin tocar el array original. */
function reorder<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Decide en qué orden salen los platos de la portada.
 *
 * Antes se mostraban por antigüedad y lo único que se podía hacer era marcar y
 * desmarcar destacados hasta que aparecieran los que se querían.
 *
 * La lista incluye TODOS los destacados, con una línea donde corta la portada:
 * así la tarjeta también responde a "¿cuáles se ven?", que es la otra mitad de
 * la duda, sin tener que contar a mano.
 */
export function FeaturedOrderCard({ dishes }: { dishes: Dish[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const featured = dishes
    .filter((dish) => dish.is_featured)
    .sort(byFeaturedOrder);

  // Las flechas responden al instante; si la acción falla, el estado optimista
  // se descarta solo al terminar la transición. Igual que en `DishTable`.
  const [optimistic, applyMove] = useOptimistic(
    featured,
    (current, move: { id: string; direction: MoveDirection }) => {
      const from = current.findIndex((dish) => dish.id === move.id);
      if (from === -1) return current;
      return reorder(
        current,
        from,
        move.direction === "up" ? from - 1 : from + 1,
      );
    },
  );

  // Con un solo destacado no hay nada que ordenar y la tarjeta solo estorbaría.
  // Cuántos hay en la portada ya lo dice la cabecera de la tabla de platos.
  if (featured.length < 2) return null;

  function handleMove(dish: Dish, direction: MoveDirection) {
    setError(null);
    startTransition(async () => {
      applyMove({ id: dish.id, direction });
      const result = await moveFeatured(dish.id, direction);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-dark">
        <Star size={18} className="text-secondary" />
        Orden de la portada
      </h2>
      <p className="mb-4 text-sm text-dark/50">
        La portada muestra los {FEATURED_LIMIT} primeros, en este orden.
      </p>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <ol className="space-y-2">
        {optimistic.map((dish, index) => {
          const shown = index < FEATURED_LIMIT;

          return (
            <Fragment key={dish.id}>
              {index === FEATURED_LIMIT && (
                <li
                  aria-hidden
                  className="flex items-center gap-3 pt-1 text-xs font-semibold uppercase tracking-wide text-dark/35"
                >
                  <span className="h-px flex-1 bg-dark/10" />
                  No salen en la portada
                  <span className="h-px flex-1 bg-dark/10" />
                </li>
              )}

              <li
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2",
                  shown
                    ? "border-dark/10 bg-white"
                    : "border-dashed border-dark/15 opacity-55",
                )}
              >
                <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-dark/40">
                  {index + 1}
                </span>

                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-dark/5">
                  {dish.image_url ? (
                    <Image
                      src={dish.image_url}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg">
                      🍽️
                    </div>
                  )}
                </div>

                <span className="min-w-0 flex-1 truncate font-semibold text-dark">
                  {dish.name}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  <MoveButton
                    label={`Subir ${dish.name} en la portada`}
                    disabled={pending || index === 0}
                    onClick={() => handleMove(dish, "up")}
                  >
                    <ArrowUp size={16} />
                  </MoveButton>
                  <MoveButton
                    label={`Bajar ${dish.name} en la portada`}
                    disabled={pending || index === optimistic.length - 1}
                    onClick={() => handleMove(dish, "down")}
                  >
                    <ArrowDown size={16} />
                  </MoveButton>
                </div>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </Card>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="rounded-lg border border-dark/10 p-1.5 text-dark/55 transition-colors hover:bg-dark/5 hover:text-dark disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
