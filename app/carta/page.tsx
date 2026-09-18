import type { Metadata } from "next";

import { MenuSection } from "@/components/menu/MenuSection";
import { FloatingActions } from "@/components/site/FloatingActions";
import { Footer } from "@/components/site/Footer";
import { JsonLd } from "@/components/site/JsonLd";
import { SiteHeader } from "@/components/site/SiteHeader";
import { DEEPLINK_PARAM, deepLinkRef, resolveDishRef } from "@/lib/deeplink";
import { getAvailableDishes, getSettings } from "@/lib/queries";
import { breadcrumbSchema, menuSchema } from "@/lib/seo";

export const metadata: Metadata = {
  // El layout raíz añade el sufijo "| El Mesón de Carmen" con su template.
  title: "Carta Completa",
  alternates: { canonical: "/carta" },
  description:
    "Toda la carta de El Mesón de Carmen en Riohacha: entradas, sopas, platos fuertes, bebidas y postres. Pide por WhatsApp.",
};

export default async function CartaPage({ searchParams }: PageProps<"/carta">) {
  const [dishes, settings, params] = await Promise.all([
    getAvailableDishes(),
    getSettings(),
    searchParams,
  ]);

  // Enlace compartido: la carta completa ya está en memoria, así que el plato
  // se resuelve aquí mismo sin volver a consultar Supabase.
  const ref = deepLinkRef(params[DEEPLINK_PARAM]);
  const deepLinkDish = ref ? resolveDishRef(dishes, ref) : null;

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
      <FloatingActions
        deliveryFee={settings.deliveryFee}
        deepLinkDish={deepLinkDish}
      />
    </>
  );
}
