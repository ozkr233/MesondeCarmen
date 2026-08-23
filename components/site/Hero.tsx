import { site } from "@/lib/site";
import { DEFAULT_GREETING, whatsappLink } from "@/lib/whatsapp";

export function Hero() {
  const orderLink = whatsappLink(DEFAULT_GREETING);

  return (
    <header
      className="relative flex min-h-screen items-center bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%), url('${site.heroImage}')`,
      }}
    >
      <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between p-5">
        <span className="font-display text-3xl font-black text-white [text-shadow:2px_2px_4px_rgb(0_0_0_/_0.5)]">
          {site.name}
        </span>
        <a
          href={orderLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-wa hidden rounded-lg px-5 py-2 text-sm uppercase md:inline-block"
        >
          Pedir Ahora
        </a>
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
        <a
          href="#menu"
          className="btn-wa inline-block rounded-lg px-10 py-5 text-xl uppercase tracking-wide"
        >
          🛒 Ver Carta y Pedir Ahora
        </a>
      </div>
    </header>
  );
}
