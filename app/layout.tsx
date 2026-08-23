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

export const metadata: Metadata = {
  title: "El Mesón de Carmen | Pide tu Comida Guajira en Riohacha",
  description:
    "¿Antojo de comida popular en Riohacha? Pide los mejores platos guajiros en El Mesón de Carmen. 30 años de sabor. Haz tu pedido por WhatsApp ahora.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">{children}</body>
    </html>
  );
}
