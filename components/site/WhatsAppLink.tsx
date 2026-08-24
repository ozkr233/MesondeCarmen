"use client";

import type { AnchorHTMLAttributes } from "react";

import { trackEvent, type WhatsAppOrigin } from "@/lib/analytics";
import { DEFAULT_GREETING, whatsappLink } from "@/lib/whatsapp";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  origen: WhatsAppOrigin;
};

/**
 * Enlace de saludo a WhatsApp, el que no lleva pedido armado.
 *
 * Existe como hoja cliente para no tener que convertir a `"use client"` los
 * cinco Server Components que lo usan solo para colgarles un `onClick`. El
 * `origen` separa estos clics del pedido real: si se contaran juntos, no habría
 * forma de saber cuántos de esos mensajes traían un pedido de verdad.
 */
export function WhatsAppLink({ origen, children, ...props }: Props) {
  return (
    <a
      href={whatsappLink(DEFAULT_GREETING)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("whatsapp_click", { origen })}
      {...props}
    >
      {children}
    </a>
  );
}
