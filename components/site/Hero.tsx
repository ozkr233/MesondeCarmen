import Link from "next/link";

import { Logo } from "@/components/site/Logo";
import { WhatsAppLink } from "@/components/site/WhatsAppLink";
import { site } from "@/lib/site";

export function Hero() {
  return (
    // `pt-28` reserva el alto de la barra del logo, que va en `absolute`: sin
    // él, en un teléfono el contenido centrado sube hasta quedar debajo de ella.
    // `svh` y no `vh`: en el móvil `100vh` incluye la barra del navegador.
    <header
      className="relative flex min-h-svh items-center bg-cover bg-center pb-16 pt-28"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%), url('${site.heroImage}')`,
      }}
    >
      <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between p-4 sm:p-5">
        <span className="flex items-center gap-3 font-display text-xl font-black leading-tight text-white [text-shadow:2px_2px_4px_rgb(0_0_0_/_0.5)] sm:text-3xl">
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

      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 md:text-left">
        {/* Si en un teléfono estrecho pasa a dos líneas, `rounded-2xl` evita
            que quede como una píldora aplastada. */}
        <span className="mb-4 inline-block rounded-2xl bg-secondary px-4 py-1 text-xs font-bold uppercase tracking-wide text-dark sm:rounded-full sm:text-sm sm:tracking-wider">
          ⭐ 30 Años de Tradición en Riohacha
        </span>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-6xl">
          ¿Antojo de Buena Comida Guajira?
        </h1>
        <p className="mb-8 text-lg font-light text-gray-100 sm:text-xl md:text-2xl">
          Preparamos los platos más representativos de La Guajira con el sazón
          de siempre. Pide rápido, come rico.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
          <a
            href="#menu"
            className="btn-wa inline-block rounded-lg px-6 py-4 text-lg uppercase tracking-wide sm:px-10 sm:py-5 sm:text-xl"
          >
            🛒 Pedir Ahora
          </a>
          <Link
            href="/carta"
            className="inline-block rounded-lg border-2 border-white/70 px-6 py-4 text-lg font-bold uppercase tracking-wide text-white transition-colors hover:border-white hover:bg-white hover:text-dark sm:px-10 sm:py-5 sm:text-xl"
          >
            Ver Carta Completa
          </Link>
        </div>
      </div>
    </header>
  );
}
