import Link from "next/link";

import { Logo } from "@/components/site/Logo";
import { site } from "@/lib/site";

export function Footer() {
  return (
    // El `pb-44` del móvil deja el contenido por encima de los botones
    // flotantes (WhatsApp y carrito), que al final de la página lo tapaban.
    // Desde `sm` el texto centrado ya no llega a la esquina donde están.
    <footer className="bg-dark px-4 pb-44 pt-8 text-center text-white sm:pb-8">
      <Logo size={96} className="mx-auto mb-3 h-20 w-20" />
      <p className="mb-2 font-display text-2xl font-bold">{site.name}</p>
      <p className="mb-4 text-gray-400">{site.tagline}</p>
      <p className="mb-4">
        <Link
          href="/carta"
          className="font-semibold text-secondary transition-colors hover:text-white"
        >
          Ver carta completa
        </Link>
      </p>
      <p className="text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Todos los derechos reservados.{" "}
        <Link href="/admin" className="transition-colors hover:text-secondary">
          Administrar
        </Link>
      </p>
    </footer>
  );
}
