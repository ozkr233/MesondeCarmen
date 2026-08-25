import { create } from "zustand";
import { persist } from "zustand/middleware";

import { MAX_LINES, MAX_QUANTITY } from "@/lib/validation";
import type { CartItem, Dish } from "@/types/dish";

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (dish: Dish) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
};

/**
 * Los topes son los mismos que valida `saveOrder` y que exige el CHECK de
 * `order_items`. Sin ellos el carrito deja armar un pedido que el servidor
 * rechaza después, cuando el mensaje de WhatsApp ya salió.
 */
const clamp = (quantity: number) => Math.min(quantity, MAX_QUANTITY);

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,

      addItem: (dish) =>
        set((state) => {
          const existing = state.items.find((item) => item.id === dish.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === dish.id
                  ? { ...item, quantity: clamp(item.quantity + 1) }
                  : item,
              ),
            };
          }
          // La carta no llega a 50 platos, así que esto no se alcanza pulsando;
          // está por si el carrito guardado en localStorage viene manipulado.
          if (state.items.length >= MAX_LINES) return state;

          return {
            items: [
              ...state.items,
              {
                id: dish.id,
                name: dish.name,
                price: dish.price,
                image_url: dish.image_url,
                quantity: 1,
              },
            ],
          };
        }),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      setQuantity: (id, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) =>
                  i.id === id ? { ...i, quantity: clamp(quantity) } : i,
                ),
        })),

      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: "meson-carmen-cart",
      // `isOpen` es estado de UI: no debe sobrevivir a una recarga.
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const countItems = (items: CartItem[]) =>
  items.reduce((total, item) => total + item.quantity, 0);

export const sumItems = (items: CartItem[]) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0);
