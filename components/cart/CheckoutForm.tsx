"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { OrderTotals } from "@/components/cart/OrderTotals";
import { PendingNotice } from "@/components/cart/PendingNotice";
import { useSendOrder } from "@/components/cart/useSendOrder";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCOP } from "@/lib/format";
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
import type { CustomerInfo } from "@/lib/whatsapp";
import { sumItems, useCart } from "@/store/cart";

const EMPTY: CustomerInfo = {
  name: "",
  phone: "",
  address: "",
  notes: "",
  payment: "",
  cashBill: "",
};

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

export function CheckoutForm({
  onBack,
  deliveryFee,
}: {
  onBack: () => void;
  deliveryFee: number;
}) {
  const items = useCart((state) => state.items);
  const { sending, pending, send, retry, dismiss } = useSendOrder(deliveryFee);

  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );

  const update =
    (field: keyof CustomerInfo) =>
    (event: { target: { value: string } }) => {
      const next = { ...customer, [field]: event.target.value };
      setCustomer(next);

      // Corregir no debe seguir mostrando el regaño: en cuanto el campo pasa,
      // el error se va. Solo se revalida lo que ya estaba marcado.
      //
      // El pago arrastra al billete: pasar de Efectivo a Bre-B esconde el
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0 || sending || pending) return;

    // La validación va aquí, antes de `send` y sobre todo antes de que abra la
    // pestaña: si no, se abriría WhatsApp con datos que no sirven.
    const found = validateCustomer(customer);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setTouched(Object.fromEntries(FIELD_ORDER.map((field) => [field, true])));

      const first = FIELD_ORDER.find((field) => found[field]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }

    // Recortado y con el teléfono normalizado: el dueño recibe siempre un
    // "300 123 4567" que puede pulsar, y la fila cabe en los CHECK de la base.
    // Sin `await`: `send` tiene que abrir la pestaña dentro de este mismo gesto.
    void send(cleanCustomer(customer));
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

        {/* El billete solo tiene sentido con efectivo: con transferencia o
            Bre-B no hay cambio que preparar y el campo estorbaría. */}
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

        {pending ? (
          <PendingNotice
            pending={pending}
            sending={sending}
            onRetry={retry}
            onDismiss={dismiss}
          />
        ) : (
          <Button
            type="submit"
            variant="whatsapp"
            size="lg"
            className="mt-4 w-full"
            disabled={sending}
          >
            {sending && <Loader2 size={18} className="animate-spin" />}
            {/* En el teléfono el texto completo se partía en dos líneas y el
                botón le quitaba alto al formulario. */}
            {sending ? (
              "Enviando…"
            ) : (
              <span>
                Enviar<span className="hidden sm:inline"> pedido</span> por
                WhatsApp
              </span>
            )}
          </Button>
        )}
      </footer>
    </form>
  );
}
