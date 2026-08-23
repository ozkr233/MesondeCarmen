"use client";

import { ShoppingCart } from "lucide-react";
import { useSyncExternalStore } from "react";

import { countItems, useCart } from "@/store/cart";

/**
 * El carrito se rehidrata desde localStorage después del render del servidor.
 * `useSyncExternalStore` devuelve 0 en el servidor y en el primer render del
 * cliente, y se actualiza al terminar la hidratación: así no hay desajuste.
 */
function useCartCount() {
  return useSyncExternalStore(
    useCart.subscribe,
    () => countItems(useCart.getState().items),
    () => 0,
  );
}

export function CartFab() {
  const openCart = useCart((state) => state.openCart);
  const total = useCartCount();

  if (total === 0) return null;

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Ver carrito (${total} ${total === 1 ? "producto" : "productos"})`}
      className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-dark"
    >
      <ShoppingCart size={28} />
      <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-light bg-secondary text-sm font-bold text-dark">
        {total}
      </span>
    </button>
  );
}
