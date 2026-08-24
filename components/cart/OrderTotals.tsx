import { formatCOP } from "@/lib/format";

/**
 * Desglose Subtotal / Domicilio / Total. Si no hay tarifa de envío
 * configurada se muestra solo el total, sin una línea de "Domicilio $0".
 */
export function OrderTotals({
  subtotal,
  deliveryFee,
}: {
  subtotal: number;
  deliveryFee: number;
}) {
  const hasDelivery = deliveryFee > 0;

  return (
    <div className="space-y-1.5">
      {hasDelivery && (
        <>
          <Row label="Subtotal" value={subtotal} />
          <Row label="Domicilio" value={deliveryFee} />
          <hr className="border-dark/10" />
        </>
      )}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-lg font-semibold text-dark/70">Total</span>
        <span className="text-2xl font-black text-primary">
          {formatCOP(subtotal + deliveryFee)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-dark/55">{label}</span>
      <span className="font-semibold text-dark/75">{formatCOP(value)}</span>
    </div>
  );
}
