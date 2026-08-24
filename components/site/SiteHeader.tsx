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
          className="flex items-center gap-2 font-display text-xl font-black transition-colors hover:text-secondary sm:text-2xl"
        >
          <Logo size={44} className="h-10 w-10 shrink-0" priority />
          {site.name}
        </Link>

        <nav className="flex items-center gap-4 text-sm">
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
          <WhatsAppLink
            origen="header"
            className="btn-wa rounded-lg px-4 py-2 text-xs uppercase"
          >
            Pedir Ahora
          </WhatsAppLink>
        </nav>
      </div>
    </header>
  );
}
