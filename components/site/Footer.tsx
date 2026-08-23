import Link from "next/link";

import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="bg-dark py-8 text-center text-white">
      <p className="mb-2 font-display text-2xl font-bold">{site.name}</p>
      <p className="mb-4 text-gray-400">{site.tagline}</p>
      <p className="text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Todos los derechos reservados.{" "}
        <Link href="/admin" className="transition-colors hover:text-secondary">
          Administrar
        </Link>
      </p>
    </footer>
  );
}
