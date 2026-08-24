import Link from "next/link";

import { Logo } from "@/components/site/Logo";
import { WhatsAppLink } from "@/components/site/WhatsAppLink";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <header
      className="relative flex min-h-screen items-center bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%), url('${site.heroImage}')`,
      }}
    >
      <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between p-5">
        <span className="flex items-center gap-3 font-display text-2xl font-black text-white [text-shadow:2px_2px_4px_rgb(0_0_0_/_0.5)] sm:text-3xl">
          <Logo
            size={64}
            priority
            className="h-12 w-12 shrink-0 drop-shadow-lg sm:h-14 sm:w-14"
          />
          {site.name}
        </span>
        <WhatsAppLink
          origen="hero"
          className="btn-wa hidden rounded-lg px-5 py-2 text-sm uppercase md:inline-block"
        >
          Pedir Ahora
        </WhatsAppLink>
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center md:text-left">
        <span className="mb-4 inline-block rounded-full bg-secondary px-4 py-1 text-sm font-bold uppercase tracking-wider text-dark">
          ⭐ 30 Años de Tradición en Riohacha
        </span>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-6xl">
          ¿Antojo de Buena Comida Guajira?
        </h1>
        <p className="mb-8 text-xl font-light text-gray-100 md:text-2xl">
          Preparamos los platos más representativos de La Guajira con el sazón
          de siempre. Pide rápido, come rico.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
          <a
            href="#menu"
            className="btn-wa inline-block rounded-lg px-10 py-5 text-xl uppercase tracking-wide"
          >
            🛒 Pedir Ahora
          </a>
          <Link
            href="/carta"
            className="inline-block rounded-lg border-2 border-white/70 px-10 py-5 text-xl font-bold uppercase tracking-wide text-white transition-colors hover:border-white hover:bg-white hover:text-dark"
          >
            Ver Carta Completa
          </Link>
        </div>
      </div>
    </header>
  );
}
