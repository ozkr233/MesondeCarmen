import { MenuSection } from "@/components/menu/MenuSection";
import { FloatingActions } from "@/components/site/FloatingActions";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { LocationSection } from "@/components/site/LocationSection";
import { WhyUs } from "@/components/site/WhyUs";
import { getFeaturedDishes, getSettings } from "@/lib/queries";

export default async function HomePage() {
  const [dishes, settings] = await Promise.all([
    getFeaturedDishes(),
    getSettings(),
  ]);

  return (
    <>
      <Hero />
      <MenuSection dishes={dishes} variant="destacados" />
      <WhyUs />
      <LocationSection />
      <Footer />
      <FloatingActions deliveryFee={settings.deliveryFee} />
    </>
  );
}
