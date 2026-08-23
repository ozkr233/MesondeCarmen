"use client";

import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { Button } from "@/components/ui/Button";
import { formatCOP } from "@/lib/format";
import { sumItems, useCart } from "@/store/cart";

export function CartDrawer() {
  const isOpen = useCart((state) => state.isOpen);

  // El panel se monta solo mientras está abierto: así su estado interno
  // (el paso del checkout) arranca limpio en cada apertura sin resetearlo
  // desde un efecto.
  if (!isOpen) return null;
  return <CartPanel />;
}

function CartPanel() {
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

  const total = sumItems(items);

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
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
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
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-dark/70">Total</span>
                <span className="text-2xl font-black text-primary">
                  {formatCOP(total)}
                </span>
              </div>
              <Button
                variant="whatsapp"
                size="lg"
                className="w-full"
                onClick={() => setRequestedStep("checkout")}
              >
                Continuar con el pedido
              </Button>
            </footer>
          </>
        ) : (
          <CheckoutForm onBack={() => setRequestedStep("cart")} />
        )}
      </aside>
    </div>
  );
}

function QtyButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="p-1.5 text-dark/60 transition-colors hover:bg-dark/5 hover:text-dark"
    >
      {children}
    </button>
  );
}
