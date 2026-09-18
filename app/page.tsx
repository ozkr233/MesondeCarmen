import type { Metadata } from "next";

import { MenuSection } from "@/components/menu/MenuSection";
import { FloatingActions } from "@/components/site/FloatingActions";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { JsonLd } from "@/components/site/JsonLd";
import { LocationSection } from "@/components/site/LocationSection";
import { WhyUs } from "@/components/site/WhyUs";
import { DEEPLINK_PARAM, deepLinkRef } from "@/lib/deeplink";
import { findDishByRef, getFeaturedDishes, getSettings } from "@/lib/queries";
import { restaurantSchema, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [dishes, settings, params] = await Promise.all([
    getFeaturedDishes(),
    getSettings(),
    searchParams,
  ]);

  // La portada solo trae los destacados, así que el plato del enlace hay que
  // buscarlo aparte — y solo cuando el enlace trae uno, para que la visita
  // normal no pague una consulta de más.
  const ref = deepLinkRef(params[DEEPLINK_PARAM]);
  const deepLinkDish = ref ? await findDishByRef(ref) : null;

  return (
    <>
      {/* Ficha del negocio para Google: dirección, teléfono y horarios. */}
      <JsonLd schema={restaurantSchema()} />
      <JsonLd schema={websiteSchema()} />
      <Hero />
      <MenuSection dishes={dishes} variant="destacados" />
      <WhyUs />
      <LocationSection />
      <Footer />
      <FloatingActions
        deliveryFee={settings.deliveryFee}
        deepLinkDish={deepLinkDish}
      />
    </>
  );
}
