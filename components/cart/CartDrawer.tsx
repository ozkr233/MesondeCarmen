"use client";

import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import { formatCOP } from "@/lib/format";
import { MAX_QUANTITY } from "@/lib/validation";
import { countItems, sumItems, useCart } from "@/store/cart";

export function CartDrawer({ deliveryFee }: { deliveryFee: number }) {
  const isOpen = useCart((state) => state.isOpen);

  // El panel se monta solo mientras está abierto: así su estado interno
  // (el paso del checkout) arranca limpio en cada apertura sin resetearlo
  // desde un efecto.
  if (!isOpen) return null;
  return <CartPanel deliveryFee={deliveryFee} />;
}

function CartPanel({ deliveryFee }: { deliveryFee: number }) {
  const closeCart = useCart((state) => state.closeCart);
  const items = useCart((state) => state.items);
  const setQuantity = useCart((state) => state.setQuantity);
  const removeItem = useCart((state) => state.removeItem);

  const [requestedStep, setRequestedStep] = useState<"cart" | "checkout">(
    "cart",
  );
  // Si el carrito se vacía estando en el checkout, se vuelve solo al listado.
  const step = items.length === 0 ? "cart" : requestedStep;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeCart]);

  const subtotal = sumItems(items);

  return (
    <div className="fixed inset-0 z-[150]">
      <div
        className="absolute inset-0 bg-dark/60 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-light shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-dark/10 bg-white px-5 py-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-dark">
            <ShoppingCart size={20} className="text-primary" />
            {step === "cart" ? "Tu Pedido" : "Tus Datos"}
          </h3>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="rounded-lg p-1 text-dark/50 transition-colors hover:bg-dark/5 hover:text-dark"
          >
            <X size={22} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingCart size={48} className="text-dark/15" />
            <p className="font-semibold text-dark/60">Tu carrito está vacío</p>
            <p className="text-sm text-dark/45">
              Agrega platos de la carta para armar tu pedido.
            </p>
            <Button variant="outline" onClick={closeCart} className="mt-2">
              Ver la carta
            </Button>
          </div>
        ) : step === "cart" ? (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-xl bg-white p-3 shadow-sm"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-dark/5">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        // El panel se monta dentro de un overlay `fixed` al
                        // hacer clic; con el `lazy` por defecto el navegador no
                        // llega a pedir estas miniaturas y el recuadro se
                        // quedaba vacío.
                        loading="eager"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold leading-tight text-dark">
                        {item.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Quitar ${item.name}`}
                        className="shrink-0 rounded p-1 text-dark/35 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-lg border border-dark/10">
                        <QtyButton
                          label={`Quitar una unidad de ${item.name}`}
                          onClick={() => setQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus size={14} />
                        </QtyButton>
                        <span className="w-7 text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <QtyButton
                          label={`Agregar una unidad de ${item.name}`}
                          disabled={item.quantity >= MAX_QUANTITY}
                          title={
                            item.quantity >= MAX_QUANTITY
                              ? `No se pueden pedir más de ${MAX_QUANTITY} unidades de un plato.`
                              : undefined
                          }
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus size={14} />
                        </QtyButton>
                      </div>
                      <span className="font-bold text-primary">
                        {formatCOP(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <footer className="border-t border-dark/10 bg-white p-5">
              <OrderTotals subtotal={subtotal} deliveryFee={deliveryFee} />
              <Button
                variant="whatsapp"
                size="lg"
                className="mt-4 w-full"
                onClick={() => {
                  trackEvent("checkout_iniciado", {
                    total: subtotal + deliveryFee,
                    items: countItems(items),
                  });
                  setRequestedStep("checkout");
                }}
              >
                Continuar con el pedido
              </Button>
            </footer>
          </>
        ) : (
          <CheckoutForm
            deliveryFee={deliveryFee}
            onBack={() => setRequestedStep("cart")}
          />
        )}
      </aside>
    </div>
  );
}

function QtyButton({
  label,
  onClick,
  disabled,
  title,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      className="p-1.5 text-dark/60 transition-colors hover:bg-dark/5 hover:text-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
