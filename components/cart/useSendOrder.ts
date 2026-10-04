import { useState } from "react";

import { saveOrder } from "@/app/actions/orders";
import { trackEvent } from "@/lib/analytics";
import { orderCode } from "@/lib/order-code";
import { buildOrderUrl, type CustomerInfo } from "@/lib/whatsapp";
import { countItems, sumItems, useCart } from "@/store/cart";
import type { CartItem } from "@/types/dish";

/** Más allá de esto se sigue adelante sin esperar a que termine el registro. */
const SAVE_TIMEOUT_MS = 3000;

/** Qué pasó al registrar el pedido. `error` en null es que quedó guardado. */
type SaveOutcome = { error: string | null };

/**
 * Pedido que ya salió por WhatsApp y cuyo registro falló.
 *
 * Guarda el código del envío original porque reintentar tiene que reescribir
 * ESE pedido: con un código nuevo, el dueño se quedaría con uno en el chat que
 * no existe en el panel.
 */
export type PendingOrder = {
  code: string;
  /** null si salió con el formulario apagado. */
  customer: CustomerInfo | null;
  items: CartItem[];
  error: string;
};

/**
 * Registra el pedido en Supabase, pero nunca hace esperar al cliente más de
 * `SAVE_TIMEOUT_MS`: si la base se cae o va lenta, el pedido tiene que salir
 * igual. Perder el registro es un problema; perder la venta es peor.
 *
 * Agotar la espera no cancela nada — la petición sigue viva en el navegador y
 * el pedido acaba guardándose — y el mensaje de WhatsApp ya lleva el código,
 * así que el chat y el panel coinciden aunque aquí no se llegue a esperar. Por
 * eso el timeout se devuelve como éxito: avisar de un fallo que casi seguro no
 * ocurrió sería peor que callarlo. Solo se reporta lo que falló de verdad.
 */
async function saveWithTimeout(
  items: CartItem[],
  customer: CustomerInfo | null,
  code: string,
): Promise<SaveOutcome> {
  const save = saveOrder({
    items: items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      portion: item.portion,
    })),
    code,
    customer,
  })
    .then((result): SaveOutcome => {
      if (result.error) console.error("[pedido]", result.error);
      return { error: result.error };
    })
    .catch((error: unknown): SaveOutcome => {
      console.error("[pedido]", error);
      return { error: "No se pudo conectar para registrar el pedido." };
    });

  const timeout = new Promise<SaveOutcome>((resolve) =>
    setTimeout(() => resolve({ error: null }), SAVE_TIMEOUT_MS),
  );

  return Promise.race([save, timeout]);
}

/**
 * Envía el carrito: abre WhatsApp con el pedido armado y lo registra en el
 * panel. Lo comparten el formulario del checkout y el botón directo del
 * carrito, que es el que se ve cuando el formulario está apagado desde /admin.
 *
 * `send(null)` es ese envío sin formulario: el mensaje sale sin datos del
 * cliente y la fila se guarda sin ellos.
 */
export function useSendOrder(deliveryFee: number) {
  const items = useCart((state) => state.items);
  const clear = useCart((state) => state.clear);
  const closeCart = useCart((state) => state.closeCart);

  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<PendingOrder | null>(null);

  /**
   * Hay que llamarla directamente desde el clic o el submit, sin nada que
   * espere antes: `window.open` solo pasa sin bloqueo dentro del gesto.
   */
  async function send(customer: CustomerInfo | null) {
    if (items.length === 0 || sending) return;
    // Con un envío ya hecho y pendiente de registro, reenviar generaría un
    // código nuevo y le mandaría al dueño el mismo pedido por segunda vez.
    if (pending) return;

    setSending(true);

    // La pestaña se abre de forma síncrona dentro del submit para que el
    // navegador no la trate como popup y la bloquee; se navega justo después.
    // Va sin `noopener` a propósito: esa opción devuelve null y perderíamos la
    // referencia que hace falta para navegarla.
    const tab = window.open("about:blank", "_blank");

    // El código se genera aquí, antes de guardar, y no en el servidor: así el
    // mensaje sale de inmediato con el mismo código que llevará la fila, sin
    // que el cliente espere a la base mirando una pestaña en blanco.
    const code = orderCode();

    // `clear()` vacía el carrito al final, así que el detalle se copia antes.
    const snapshot = items;
    const url = buildOrderUrl(snapshot, customer, deliveryFee, code);

    // Con pestaña nueva se navega ya y el registro ocurre detrás, sin que el
    // cliente espere a la base. Sin ella (popup bloqueado, lo habitual en los
    // WebView de Instagram y Facebook) hay que invertirlo: navegar esta misma
    // pestaña descarga el documento y cancela la petición en vuelo, así que el
    // pedido se perdería aunque el mensaje sí llegase.
    let outcome: SaveOutcome;
    if (tab) {
      tab.location.href = url;
      tab.opener = null;
      outcome = await saveWithTimeout(snapshot, customer, code);
    } else {
      outcome = await saveWithTimeout(snapshot, customer, code);
      window.location.href = url;
    }

    trackEvent("pedido_enviado", {
      total: sumItems(snapshot) + deliveryFee,
      items: countItems(snapshot),
      code,
    });

    // El carrito no se vacía si el registro falló: el aviso vive en el pie del
    // carrito o del formulario, que `CartDrawer` solo pinta mientras queden
    // platos, así que vaciarlo se llevaría por delante el aviso antes de que
    // nadie llegue a leerlo.
    if (outcome.error) {
      setPending({ code, customer, items: snapshot, error: outcome.error });
      setSending(false);
      return;
    }

    clear();
    closeCart();
  }

  /**
   * Reintenta solo el registro, con el código del envío original y sin volver a
   * abrir WhatsApp: el dueño ya tiene el mensaje y no debe recibirlo dos veces.
   */
  async function retry() {
    if (!pending || sending) return;
    setSending(true);

    const outcome = await saveWithTimeout(
      pending.items,
      pending.customer,
      pending.code,
    );

    if (outcome.error) {
      setPending({ ...pending, error: outcome.error });
      setSending(false);
      return;
    }

    clear();
    closeCart();
  }

  /** El pedido ya está en el chat: se da por resuelto y se suelta el carrito. */
  function dismiss() {
    clear();
    closeCart();
  }

  return { sending, pending, send, retry, dismiss };
}
