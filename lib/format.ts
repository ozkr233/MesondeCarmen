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
