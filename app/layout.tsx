import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";

import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});

const TITLE = "El Mesón de Carmen | Pide tu Comida Guajira en Riohacha";
const DESCRIPTION =
  "¿Antojo de comida popular en Riohacha? Pide los mejores platos guajiros en El Mesón de Carmen. 30 años de sabor. Haz tu pedido por WhatsApp ahora.";

/**
 * Necesario para que la imagen de `app/opengraph-image.png` se anuncie con una
 * URL absoluta: WhatsApp y Facebook no resuelven rutas relativas. En Vercel el
 * dominio se toma solo; en local cae a localhost.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "El Mesón de Carmen",
    locale: "es_CO",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">
        {children}
        {/* Analítica de Vercel: hay que activarla también en el panel del
            proyecto (pestaña Analytics → Enable) o estos no reportan nada. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
