"use client";

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics";
import { DEEPLINK_PARAM } from "@/lib/deeplink";
import { useCart } from "@/store/cart";
import type { Dish } from "@/types/dish";

/**
 * Aplica el enlace compartido: mete el plato en el carrito y abre el cajón.
 * El servidor ya resolvió el `?plato=` contra la carta, así que aquí `dish` es
 * null cuando el enlace no apuntaba a nada pedible.
 *
 * No pinta nada: solo existe para correr el efecto después de la hidratación,
 * que es cuando `persist` ya restauró el carrito guardado y el plato del enlace
 * puede sumarse a lo que la persona ya traía.
 */
export function CartDeepLink({ dish }: { dish: Dish | null }) {
  const applied = useRef(false);

  useEffect(() => {
    // En desarrollo React monta dos veces; sin esta guarda el plato entraría
    // con cantidad 2.
    if (applied.current) return;
    applied.current = true;

    if (dish) {
      const { addItem, openCart } = useCart.getState();
      addItem(dish);
      openCart();
      trackEvent("carrito_deeplink", { plato: dish.name });
    }

    // El parámetro se borra con o sin plato: si sigue en la barra, recargar
    // suma otra unidad. `replaceState` en vez de `router.replace` porque este
    // no vuelve al servidor ni desmonta el cajón recién abierto.
    const url = new URL(window.location.href);
    if (!url.searchParams.has(DEEPLINK_PARAM)) return;
    url.searchParams.delete(DEEPLINK_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [dish]);

  return null;
}
