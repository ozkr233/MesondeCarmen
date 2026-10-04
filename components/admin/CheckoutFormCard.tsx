"use client";

import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";

import { updateCheckoutForm } from "@/app/admin/actions";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";

export function CheckoutFormCard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Igual que los interruptores de la tabla: responde al instante y, si la
  // acción falla, el valor optimista se descarta solo al cerrar la transición.
  const [optimistic, setOptimistic] = useOptimistic(enabled);

  function handleChange(next: boolean) {
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      const result = await updateCheckoutForm(next);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Card className="mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-dark">
            <ClipboardList size={18} className="text-primary" />
            Formulario de pedido
          </h2>
          <p className="text-sm text-dark/50">
            Apágalo para que el cliente solo elija los platos y los mande por
            WhatsApp. La dirección y el pago se cuadran en el chat.
          </p>
        </div>

        <Switch
          checked={optimistic}
          onChange={handleChange}
          label={
            optimistic
              ? "Desactivar formulario de pedido"
              : "Activar formulario de pedido"
          }
          disabled={pending}
        />
      </div>

      <p className="mt-3 text-sm">
        {error ? (
          <span className="text-red-700">{error}</span>
        ) : optimistic ? (
          <span className="text-dark/50">
            <strong className="text-dark">Activo:</strong> el cliente llena sus
            datos antes de abrir WhatsApp.
          </span>
        ) : (
          <span className="text-dark/50">
            <strong className="text-dark">Desactivado:</strong> el pedido sale
            directo a WhatsApp con los platos y el total.
          </span>
        )}
      </p>
    </Card>
  );
}
