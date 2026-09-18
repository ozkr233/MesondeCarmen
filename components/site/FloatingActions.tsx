import { CartDeepLink } from "@/components/cart/CartDeepLink";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartFab } from "@/components/cart/CartFab";
import { WhatsAppLink } from "@/components/site/WhatsAppLink";
import type { Dish } from "@/types/dish";

/**
 * Botones flotantes de la esquina inferior derecha. Se apilan en columna
 * invertida para que el de WhatsApp baje solo cuando el carrito está vacío.
 *
 * Es el único punto que comparten `/` y `/carta`, así que también monta el
 * carrito y la aplicación del enlace compartido (`deepLinkDish`).
 */
export function FloatingActions({
  deliveryFee,
  deepLinkDish = null,
}: {
  deliveryFee: number;
  deepLinkDish?: Dish | null;
}) {
  return (
    <>
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col-reverse items-center gap-3">
        <CartFab />
        <WhatsAppLink
          origen="fab"
          aria-label="Escribirnos por WhatsApp"
          className="animate-wa-pulse flex h-16 w-16 items-center justify-center rounded-full bg-whatsapp text-3xl text-white shadow-lg transition-colors hover:bg-whatsapp-dark"
        >
          💬
        </WhatsAppLink>
      </div>
      <CartDrawer deliveryFee={deliveryFee} />
      <CartDeepLink dish={deepLinkDish} />
    </>
  );
}
