"use client";

import { Check, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import { formatCOP } from "@/lib/format";
import { useCart } from "@/store/cart";
import type { Dish } from "@/types/dish";

export function DishCard({ dish }: { dish: Dish }) {
  const addItem = useCart((state) => state.addItem);
  const openCart = useCart((state) => state.openCart);

  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handleAdd() {
    addItem(dish);
    trackEvent("carrito_agregado", { plato: dish.name });
    setJustAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 1600);
  }

  return (
    <article className="menu-card flex flex-col overflow-hidden rounded-xl bg-light shadow-lg">
      <div className="relative h-64 overflow-hidden bg-dark/5">
        {dish.image_url ? (
          <Image
            src={dish.image_url}
            alt={dish.name}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">
            🍽️
          </div>
        )}
      </div>

      <div className="flex flex-grow flex-col p-6">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="text-2xl font-bold text-dark">{dish.name}</h3>
          <span className="shrink-0 whitespace-nowrap pt-1 text-xl font-black text-primary">
            {formatCOP(dish.price)}
          </span>
        </div>

        {dish.description && (
          <p className="mb-6 flex-grow text-dark/60">{dish.description}</p>
        )}

        <div className="mt-auto flex gap-2">
          <Button onClick={handleAdd} className="flex-1">
            {justAdded ? (
              <>
                <Check size={18} /> Agregado
              </>
            ) : (
              <>
                <Plus size={18} /> Agregar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              handleAdd();
              openCart();
            }}
            aria-label={`Pedir ${dish.name} ahora`}
          >
            Pedir
          </Button>
        </div>
      </div>
    </article>
  );
}
