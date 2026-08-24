"use client";

import { Bike, Check, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { updateDeliveryFee } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { formatCOP } from "@/lib/format";

export function DeliveryFeeCard({ deliveryFee }: { deliveryFee: number }) {
  const [value, setValue] = useState(String(deliveryFee));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(value);
  const isDirty = Number.isFinite(parsed) && parsed !== deliveryFee;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateDeliveryFee(parsed);
    setSaving(false);

    if (result.error) setError(result.error);
    else setSaved(true);
  }

  return (
    <Card className="mb-6 p-5">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-dark">
            <Bike size={18} className="text-primary" />
            Costo de domicilio
          </h2>
          <p className="text-sm text-dark/50">
            Se suma al total del pedido de WhatsApp. Ponlo en 0 para no cobrar
            envío.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <Input
            label="Valor (COP)"
            type="number"
            min={0}
            step={500}
            inputMode="numeric"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSaved(false);
            }}
            className="w-36"
          />
          <Button type="submit" disabled={saving || !isDirty}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>

      <p className="mt-3 text-sm">
        {error ? (
          <span className="text-red-700">{error}</span>
        ) : saved ? (
          <span className="flex items-center gap-1.5 font-semibold text-green-700">
            <Check size={15} /> Guardado
          </span>
        ) : (
          <span className="text-dark/50">
            Actual: <strong className="text-dark">{formatCOP(deliveryFee)}</strong>
          </span>
        )}
      </p>
    </Card>
  );
}
