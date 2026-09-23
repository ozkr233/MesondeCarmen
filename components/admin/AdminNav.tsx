"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Platos" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/equipo", label: "Equipo" },
] as const;

/** Navegación del panel. Cliente solo por el resaltado de la sección activa. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    // A 320 px las tres pestañas no caben: se desplazan en vez de desbordar.
    <nav className="flex gap-1 overflow-x-auto">
      {LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors sm:px-4 ${
              isActive
                ? "bg-white/10 text-secondary"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
