"use client";

import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { formatCOP } from "@/lib/format";
import { buildOrderUrl, type CustomerInfo } from "@/lib/whatsapp";
import { sumItems, useCart } from "@/store/cart";

const EMPTY: CustomerInfo = { name: "", phone: "", address: "", notes: "" };

export function CheckoutForm({ onBack }: { onBack: () => void }) {
  const items = useCart((state) => state.items);
  const clear = useCart((state) => state.clear);
  const closeCart = useCart((state) => state.closeCart);

  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY);

  const update =
    (field: keyof CustomerInfo) =>
    (event: { target: { value: string } }) =>
      setCustomer((prev) => ({ ...prev, [field]: event.target.value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) return;

    const url = buildOrderUrl(items, customer);

    // window.open se llama de forma síncrona dentro del submit para que el
    // navegador no lo trate como popup y lo bloquee.
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = url;

    clear();
    closeCart();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
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
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-dark/70">Total</span>
          <span className="text-2xl font-black text-primary">
            {formatCOP(sumItems(items))}
          </span>
        </div>
        <Button type="submit" variant="whatsapp" size="lg" className="w-full">
          Enviar pedido por WhatsApp
        </Button>
      </footer>
    </form>
  );
}
