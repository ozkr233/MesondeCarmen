import type { Metadata } from "next";

import { MenuSection } from "@/components/menu/MenuSection";
import { FloatingActions } from "@/components/site/FloatingActions";
import { Footer } from "@/components/site/Footer";
import { JsonLd } from "@/components/site/JsonLd";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getAvailableDishes, getSettings } from "@/lib/queries";
import { breadcrumbSchema, menuSchema } from "@/lib/seo";

export const metadata: Metadata = {
  // El layout raíz añade el sufijo "| El Mesón de Carmen" con su template.
  title: "Carta Completa",
  alternates: { canonical: "/carta" },
  description:
    "Toda la carta de El Mesón de Carmen en Riohacha: entradas, sopas, platos fuertes, bebidas y postres. Pide por WhatsApp.",
};

export default async function CartaPage() {
  const [dishes, settings] = await Promise.all([
    getAvailableDishes(),
    getSettings(),
  ]);

  return (
    <>
      {/* La carta completa como datos estructurados, para que Google pueda
          mostrar los platos y sus precios. */}
      <JsonLd schema={menuSchema(dishes)} />
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Carta", path: "/carta" },
        ])}
      />
      <SiteHeader />
      <MenuSection dishes={dishes} variant="completa" />
      <Footer />
      <FloatingActions deliveryFee={settings.deliveryFee} />
    </>
  );
}
