import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";

import { siteUrl } from "@/lib/seo";
import { site } from "@/lib/site";

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

export const metadata: Metadata = {
  /**
   * Necesario para que `app/opengraph-image.png` y los canonical se anuncien
   * con URL absoluta: WhatsApp y Facebook no resuelven rutas relativas.
   */
  metadataBase: new URL(siteUrl),
  title: {
    default: TITLE,
    // Las páginas hijas solo ponen su parte ("Carta Completa").
    template: `%s | ${site.name}`,
  },
  description: DESCRIPTION,
  applicationName: site.name,
  keywords: [
    "comida guajira",
    "restaurante en Riohacha",
    "domicilios Riohacha",
    "comida típica La Guajira",
    "friche",
    "arroz de camarón",
    "almuerzos Riohacha",
    "El Mesón de Carmen",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: site.name,
    url: siteUrl,
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sin esto Google recorta la miniatura del plato en los resultados.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // El canonical se declara en cada página: uno relativo aquí lo heredarían
  // todas y /carta se anunciaría a sí misma como la portada.
};

export const viewport: Viewport = {
  themeColor: "#b8442c",
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
