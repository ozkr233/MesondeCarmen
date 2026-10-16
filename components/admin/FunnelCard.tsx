import {
  ClipboardList,
  Funnel,
  Link2,
  MessageCircle,
  Send,
  ShoppingCart,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import type { WhatsAppOrigin } from "@/lib/events";
import type { FunnelStats } from "@/types/order";

/** Cómo se llama cada enlace de WhatsApp en el panel. */
const ORIGIN_LABELS: Record<WhatsAppOrigin, string> = {
  hero: "Portada",
  header: "Cabecera",
  fab: "Botón flotante",
  carta: "Carta",
  ubicacion: "Ubicación",
};

/**
 * Embudo de los últimos 30 días, debajo de las cifras de pedidos.
 *
 * Son conteos sueltos y no porcentajes: los eventos cuentan clics, no
 * visitantes, y el paso del formulario solo existe mientras está encendido.
 * Dividir unos entre otros daría tasas que no significan nada (o que pasan del
 * 100%).
 */
export function FunnelCard({ stats }: { stats: FunnelStats }) {
  const steps = [
    {
      label: "Platos agregados al carrito",
      value: stats.added,
      icon: <ShoppingCart size={16} />,
    },
    {
      label: "Formularios abiertos",
      value: stats.checkouts,
      icon: <ClipboardList size={16} />,
      hint: "Solo con el formulario encendido.",
    },
    {
      label: "Pedidos enviados a WhatsApp",
      value: stats.sent,
      icon: <Send size={16} />,
      hint: "Incluye los que no alcanzaron a registrarse.",
    },
  ];

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-dark">
        <Funnel size={18} className="text-primary" />
        Embudo de los últimos 30 días
      </h2>

      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <li key={step.label} className="rounded-lg bg-dark/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-dark/50">
              {step.icon}
              {step.label}
            </p>
            <p className="mt-1 text-2xl font-black text-dark">{step.value}</p>
            {step.hint && (
              <p className="mt-1 text-xs text-dark/40">{step.hint}</p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-4 border-t border-dark/10 pt-4 sm:grid-cols-2">
        <p className="flex items-baseline justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-dark/70">
            <Link2 size={16} className="shrink-0 text-dark/40" />
            Llegaron por un enlace compartido
          </span>
          <span className="shrink-0 font-bold text-dark">
            {stats.deeplinks}
          </span>
        </p>

        <div className="text-sm">
          <p className="flex items-baseline justify-between gap-4">
            <span className="flex items-center gap-2 text-dark/70">
              <MessageCircle size={16} className="shrink-0 text-dark/40" />
              Clics a WhatsApp sin pedido
            </span>
            <span className="shrink-0 font-bold text-dark">
              {stats.whatsappTotal}
            </span>
          </p>
          {stats.whatsapp.length > 0 && (
            <ul className="mt-1.5 space-y-1 pl-6">
              {stats.whatsapp.map(({ origin, clicks }) => (
                <li
                  key={origin}
                  className="flex justify-between gap-4 text-xs text-dark/50"
                >
                  <span>{ORIGIN_LABELS[origin]}</span>
                  <span className="font-semibold">{clicks}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
