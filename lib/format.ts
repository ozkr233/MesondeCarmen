/**
 * Precios en pesos colombianos: sin decimales y con punto de miles ($35.000).
 */
const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCOP(value: number): string {
  return cop.format(Number.isFinite(value) ? value : 0);
}

/**
 * Fecha y hora de un pedido, siempre en hora de Colombia. La zona va fija:
 * el panel se renderiza en el servidor (UTC en Vercel) y sin esto las horas
 * saldrían corridas cinco horas.
 */
const coDateTime = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatDateTimeCO(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : coDateTime.format(date);
}
