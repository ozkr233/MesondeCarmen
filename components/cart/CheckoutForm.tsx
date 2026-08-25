"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { saveOrder } from "@/app/actions/orders";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { trackEvent } from "@/lib/analytics";
import { orderCode } from "@/lib/order-code";
import { buildOrderUrl, type CustomerInfo } from "@/lib/whatsapp";
import { countItems, sumItems, useCart } from "@/store/cart";
import type { CartItem } from "@/types/dish";

const EMPTY: CustomerInfo = { name: "", phone: "", address: "", notes: "" };

/** Más allá de esto se sigue adelante sin esperar a que termine el registro. */
const SAVE_TIMEOUT_MS = 3000;

/**
 * Registra el pedido en Supabase, pero nunca hace esperar al cliente más de
 * `SAVE_TIMEOUT_MS`: si la base se cae o va lenta, el pedido tiene que salir
 * igual. Perder el registro es un problema; perder la venta es peor.
 *
 * Agotar la espera no cancela nada — la petición sigue viva en el navegador y
 * el pedido acaba guardándose — y el mensaje de WhatsApp ya lleva el código,
 * así que el chat y el panel coinciden aunque aquí no se llegue a esperar.
 */
async function saveWithTimeout(
  items: CartItem[],
  customer: CustomerInfo,
  code: string,
): Promise<void> {
  const save = saveOrder({
    items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
    code,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    notes: customer.notes,
  })
    .then((result) => {
      if (result.error) console.error("[pedido]", result.error);
    })
    .catch((error: unknown) => {
      console.error("[pedido]", error);
    });

  const timeout = new Promise<void>((resolve) =>
    setTimeout(resolve, SAVE_TIMEOUT_MS),
  );

  await Promise.race([save, timeout]);
}

export function CheckoutForm({
  onBack,
  deliveryFee,
}: {
  onBack: () => void;
  deliveryFee: number;
}) {
  const items = useCart((state) => state.items);
  const clear = useCart((state) => state.clear);
  const closeCart = useCart((state) => state.closeCart);

  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY);
  const [sending, setSending] = useState(false);

  const update =
    (field: keyof CustomerInfo) =>
    (event: { target: { value: string } }) =>
      setCustomer((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0 || sending) return;
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

    if (tab) {
      tab.location.href = url;
      tab.opener = null;
    } else {
      window.location.href = url;
    }

    await saveWithTimeout(snapshot, customer, code);

    trackEvent("pedido_enviado", {
      total: sumItems(snapshot) + deliveryFee,
      items: countItems(snapshot),
      code,
    });

    clear();
    closeCart();
  }

  return (
    // `min-h-0` en los dos niveles: sin él, un hijo flex conserva su
    // min-height:auto, no se encoge por debajo del contenido y el pie con el
    // botón de enviar se sale de la pantalla en vez de que scrollee el formulario.
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-semibold text-dark/60 transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} /> Volver al carrito
        </button>

        <p className="text-sm text-dark/60">
          Completa tus datos y te abriremos WhatsApp con el pedido listo para
          enviar.
        </p>

        <Input
          label="Nombre"
          required
          autoComplete="name"
          placeholder="Tu nombre completo"
          value={customer.name}
          onChange={update("name")}
        />
        <Input
          label="Teléfono"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="300 123 4567"
          value={customer.phone}
          onChange={update("phone")}
        />
        <Input
          label="Dirección de entrega"
          required
          autoComplete="street-address"
          placeholder="Barrio, calle y número"
          value={customer.address}
          onChange={update("address")}
        />
        <Textarea
          label="Notas del pedido"
          rows={3}
          placeholder="Sin cebolla, tocar el timbre, punto de referencia…"
          value={customer.notes}
          onChange={update("notes")}
        />
      </div>

      <footer className="border-t border-dark/10 bg-white p-5">
        <OrderTotals subtotal={sumItems(items)} deliveryFee={deliveryFee} />
        <Button
          type="submit"
          variant="whatsapp"
          size="lg"
          className="mt-4 w-full"
          disabled={sending}
        >
          {sending && <Loader2 size={18} className="animate-spin" />}
          {sending ? "Enviando…" : "Enviar pedido por WhatsApp"}
        </Button>
      </footer>
    </form>
  );
}
