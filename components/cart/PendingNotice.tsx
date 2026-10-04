import { AlertCircle, Loader2 } from "lucide-react";

import type { PendingOrder } from "@/components/cart/useSendOrder";
import { Button } from "@/components/ui/Button";

/**
 * Aviso de un pedido que ya salió por WhatsApp pero no quedó guardado, con la
 * opción de reintentar solo el registro. Ocupa el sitio del botón de enviar,
 * tanto en el carrito como en el formulario.
 */
export function PendingNotice({
  pending,
  sending,
  onRetry,
  onDismiss,
}: {
  pending: PendingOrder;
  sending: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      {/* Ámbar y no rojo: el pedido sí le llegó al dueño por WhatsApp. Lo
          único que falló es que quedara registrado en el panel. */}
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <span>
          Tu pedido <strong>#{pending.code}</strong> ya salió por WhatsApp, pero
          no quedó guardado en el panel. {pending.error}
        </span>
      </p>
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={sending}
        onClick={onRetry}
      >
        {sending && <Loader2 size={18} className="animate-spin" />}
        {sending ? "Reintentando…" : "Reintentar registro"}
      </Button>
      <button
        type="button"
        onClick={onDismiss}
        className="w-full text-sm font-semibold text-dark/60 transition-colors hover:text-primary"
      >
        Ya lo confirmé por WhatsApp
      </button>
    </div>
  );
}
