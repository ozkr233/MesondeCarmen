import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartFab } from "@/components/cart/CartFab";
import { DEFAULT_GREETING, whatsappLink } from "@/lib/whatsapp";

/**
 * Botones flotantes de la esquina inferior derecha. Se apilan en columna
 * invertida para que el de WhatsApp baje solo cuando el carrito está vacío.
 */
export function FloatingActions() {
  return (
    <>
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col-reverse items-center gap-3">
        <CartFab />
        <a
          href={whatsappLink(DEFAULT_GREETING)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribirnos por WhatsApp"
          className="animate-wa-pulse flex h-16 w-16 items-center justify-center rounded-full bg-whatsapp text-3xl text-white shadow-lg transition-colors hover:bg-whatsapp-dark"
        >
          💬
        </a>
      </div>
      <CartDrawer />
    </>
  );
}
