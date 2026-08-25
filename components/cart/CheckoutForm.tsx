"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { saveOrder } from "@/app/actions/orders";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { trackEvent } from "@/lib/analytics";
import { formatCOP } from "@/lib/format";
import { orderCode } from "@/lib/order-code";
import {
  addressWarning,
  CASH_OPTIONS,
  cleanCustomer,
  LIMITS,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  validateCustomer,
  validateField,
  type CustomerErrors,
  type FieldName,
} from "@/lib/validation";
import { buildOrderUrl, type CustomerInfo } from "@/lib/whatsapp";
import { countItems, sumItems, useCart } from "@/store/cart";
import type { CartItem } from "@/types/dish";

const EMPTY: CustomerInfo = {
  name: "",
  phone: "",
  address: "",
  notes: "",
  payment: "",
  cashBill: "",
};

/** Más allá de esto se sigue adelante sin esperar a que termine el registro. */
const SAVE_TIMEOUT_MS = 3000;

/** Ids fijos: hacen falta para poder enfocar el primer campo que falle. */
const FIELD_IDS: Record<FieldName, string> = {
  name: "checkout-name",
  phone: "checkout-phone",
  address: "checkout-address",
  payment: "checkout-payment",
  cashBill: "checkout-cash",
};

/** Orden en que se recorren los campos al buscar el primero con error. */
const FIELD_ORDER: FieldName[] = [
  "name",
  "phone",
  "address",
  "payment",
  "cashBill",
];

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
    payment: customer.payment,
    cashBill: customer.cashBill,
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
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );
  const [sending, setSending] = useState(false);

  const update =
    (field: keyof CustomerInfo) =>
    (event: { target: { value: string } }) => {
      const next = { ...customer, [field]: event.target.value };
      setCustomer(next);

      // Corregir no debe seguir mostrando el regaño: en cuanto el campo pasa,
      // el error se va. Solo se revalida lo que ya estaba marcado.
      //
      // El pago arrastra al billete: pasar de Efectivo a Nequi esconde el
      // segundo campo, y su error tiene que irse con él o quedaría bloqueando
      // el envío desde un campo que ya no se ve.
      const affected: FieldName[] =
        field === "payment"
          ? ["payment", "cashBill"]
          : field === "notes"
            ? []
            : [field];

      for (const target of affected) {
        if (errors[target] && !validateField(target, next)) {
          setErrors((prev) => ({ ...prev, [target]: undefined }));
        }
      }
    };

  const handleBlur = (field: FieldName) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, customer) ?? undefined,
    }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0 || sending) return;

    // La validación va aquí, antes de `setSending` y sobre todo antes de abrir
    // la pestaña: si no, se abriría WhatsApp con datos que no sirven.
    const found = validateCustomer(customer);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setTouched(Object.fromEntries(FIELD_ORDER.map((field) => [field, true])));

      const first = FIELD_ORDER.find((field) => found[field]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }

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
    // Recortado y con el teléfono normalizado: el dueño recibe siempre un
    // "300 123 4567" que puede pulsar, y la fila cabe en los CHECK de la base.
    const clean = cleanCustomer(customer);
    const url = buildOrderUrl(snapshot, clean, deliveryFee, code);

    if (tab) {
      tab.location.href = url;
      tab.opener = null;
    } else {
      window.location.href = url;
    }

    await saveWithTimeout(snapshot, clean, code);

    trackEvent("pedido_enviado", {
      total: sumItems(snapshot) + deliveryFee,
      items: countItems(snapshot),
      code,
    });

    clear();
    closeCart();
  }

  // El aviso de dirección corta no bloquea el envío: solo sugiere completarla,
  // y únicamente después de que la persona haya salido del campo.
  const shortAddress = touched.address ? addressWarning(customer.address) : null;

  return (
    // `min-h-0` en los dos niveles: sin él, un hijo flex conserva su
    // min-height:auto, no se encoge por debajo del contenido y el pie con el
    // botón de enviar se sale de la pantalla en vez de que scrollee el formulario.
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
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
          id={FIELD_IDS.name}
          label="Nombre"
          required
          autoComplete="name"
          maxLength={LIMITS.name}
          placeholder="Tu nombre completo"
          value={customer.name}
          error={errors.name}
          onChange={update("name")}
          onBlur={handleBlur("name")}
        />
        <Input
          id={FIELD_IDS.phone}
          label="Teléfono"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={LIMITS.phone}
          placeholder="300 123 4567"
          value={customer.phone}
          error={errors.phone}
          hint="Te escribiremos por WhatsApp a este número."
          onChange={update("phone")}
          onBlur={handleBlur("phone")}
        />
        <Input
          id={FIELD_IDS.address}
          label="Dirección de entrega"
          required
          autoComplete="street-address"
          maxLength={LIMITS.address}
          placeholder="Barrio, calle y número"
          value={customer.address}
          error={errors.address}
          hint={
            shortAddress ? (
              <span className="text-amber-700">{shortAddress}</span>
            ) : (
              "Incluye el barrio y un punto de referencia."
            )
          }
          onChange={update("address")}
          onBlur={handleBlur("address")}
        />
        <Select
          id={FIELD_IDS.payment}
          label="Método de pago"
          required
          value={customer.payment}
          error={errors.payment}
          onChange={update("payment")}
          onBlur={handleBlur("payment")}
        >
          <option value="">Selecciona…</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_LABELS[method]}
            </option>
          ))}
        </Select>

        {/* El billete solo tiene sentido con efectivo: con tarjeta o Nequi no
            hay cambio que preparar y el campo estorbaría. */}
        {customer.payment === "efectivo" && (
          <Select
            id={FIELD_IDS.cashBill}
            label="¿Con cuánto vas a pagar?"
            required
            value={customer.cashBill}
            error={errors.cashBill}
            hint="Así el domiciliario sale con el cambio listo."
            onChange={update("cashBill")}
            onBlur={handleBlur("cashBill")}
          >
            <option value="">Selecciona…</option>
            {CASH_OPTIONS.map((bill) => (
              <option key={bill} value={String(bill)}>
                {bill === 0
                  ? "Pago exacto (no necesito cambio)"
                  : `Con ${formatCOP(bill)}`}
              </option>
            ))}
          </Select>
        )}

        <Textarea
          label="Notas del pedido"
          rows={3}
          maxLength={LIMITS.notes}
          placeholder="Sin cebolla, tocar el timbre, punto de referencia…"
          value={customer.notes}
          hint={
            <span className="block text-right tabular-nums">
              {customer.notes.length}/{LIMITS.notes}
            </span>
          }
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
