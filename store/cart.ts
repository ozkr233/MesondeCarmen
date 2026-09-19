import { create } from "zustand";
import { persist } from "zustand/middleware";

import { dishPortions, findPortion } from "@/lib/portions";
import { MAX_LINES, MAX_QUANTITY } from "@/lib/validation";
import type { CartItem, Dish } from "@/types/dish";

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (dish: Dish) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  setPortion: (id: string, people: number) => void;
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

          // Las porciones se copian del plato: el cajón no consulta `dishes` y
          // las necesita para pintar el selector. Vienen ordenadas de menor a
          // mayor, así que se arranca en la más pequeña.
          const portions = dishPortions(dish);

          return {
            items: [
              ...state.items,
              {
                id: dish.id,
                name: dish.name,
                price: dish.price,
                image_url: dish.image_url,
                quantity: 1,
                portions,
                portion: portions[0]?.people ?? null,
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

      // Solo se aceptan porciones que el plato ofrezca de verdad: el `<select>`
      // nunca manda otra cosa, pero el carrito viene de localStorage.
      setPortion: (id, people) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && findPortion(item.portions, people)
              ? { ...item, portion: people }
              : item,
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

      // Un carrito guardado antes de que existieran las porciones no trae los
      // dos campos nuevos. Sin esto el selector se pintaría vacío y
      // `findPortion` recibiría un undefined.
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { items?: CartItem[] } | undefined;
        if (version >= 1 || !state?.items) return state;

        return {
          ...state,
          items: state.items.map((item) => ({
            ...item,
            portions: [],
            portion: null,
          })),
        };
      },
    },
  ),
);

export const countItems = (items: CartItem[]) =>
  items.reduce((total, item) => total + item.quantity, 0);

/**
 * Lo que cuesta una unidad de esta línea: el precio de la porción elegida, o el
 * del plato cuando no se pide por porciones. Es el único sitio donde se decide,
 * y de aquí lo leen el cajón, el mensaje de WhatsApp y los totales.
 *
 * El precio copiado puede haber quedado viejo si el dueño lo cambió con el
 * carrito abierto; `saveOrder` lo vuelve a leer de la base antes de guardar.
 */
export const unitPrice = (item: CartItem) =>
  findPortion(item.portions, item.portion)?.price ?? item.price;

export const lineTotal = (item: CartItem) => unitPrice(item) * item.quantity;

export const sumItems = (items: CartItem[]) =>
  items.reduce((total, item) => total + lineTotal(item), 0);
