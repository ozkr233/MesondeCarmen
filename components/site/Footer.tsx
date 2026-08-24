import Link from "next/link";

import { Logo } from "@/components/site/Logo";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="bg-dark py-8 text-center text-white">
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
