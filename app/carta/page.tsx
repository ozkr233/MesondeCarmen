import type { Metadata } from "next";

import { MenuSection } from "@/components/menu/MenuSection";
import { FloatingActions } from "@/components/site/FloatingActions";
import { Footer } from "@/components/site/Footer";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getAvailableDishes, getSettings } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Carta Completa | El Mesón de Carmen",
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
      <SiteHeader />
      <MenuSection dishes={dishes} variant="completa" />
      <Footer />
      <FloatingActions deliveryFee={settings.deliveryFee} />
    </>
  );
}
