import type { Metadata } from "next";

import { MenuSection } from "@/components/menu/MenuSection";
import { FloatingActions } from "@/components/site/FloatingActions";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { JsonLd } from "@/components/site/JsonLd";
import { LocationSection } from "@/components/site/LocationSection";
import { WhyUs } from "@/components/site/WhyUs";
import { getFeaturedDishes, getSettings } from "@/lib/queries";
import { restaurantSchema, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [dishes, settings] = await Promise.all([
    getFeaturedDishes(),
    getSettings(),
  ]);

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
      <FloatingActions deliveryFee={settings.deliveryFee} />
    </>
  );
}
