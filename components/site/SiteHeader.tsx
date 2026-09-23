import Link from "next/link";

import { Logo } from "@/components/site/Logo";
import { WhatsAppLink } from "@/components/site/WhatsAppLink";
import { site } from "@/lib/site";

/** Barra superior para las páginas que no tienen el hero (por ejemplo /carta). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-dark text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-display text-lg font-black leading-tight transition-colors hover:text-secondary sm:text-2xl"
        >
          <Logo size={44} className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" priority />
          {site.name}
        </Link>

        <nav className="flex shrink-0 items-center gap-3 text-sm sm:gap-4">
          <Link
            href="/"
            className="hidden text-white/70 transition-colors hover:text-secondary sm:inline"
          >
            Inicio
          </Link>
          <Link
            href="/#ubicacion"
            className="hidden text-white/70 transition-colors hover:text-secondary sm:inline"
          >
            Ubicación
          </Link>
          {/* En el teléfono no caben el nombre y "Pedir Ahora" en una fila:
              el botón se queda en "Pedir" en vez de partirse en dos líneas. */}
          <WhatsAppLink
            origen="header"
            className="btn-wa whitespace-nowrap rounded-lg px-3 py-2 text-xs uppercase sm:px-4"
          >
            Pedir<span className="hidden sm:inline"> Ahora</span>
          </WhatsAppLink>
        </nav>
      </div>
    </header>
  );
}
