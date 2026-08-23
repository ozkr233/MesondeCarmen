import { MenuSection } from "@/components/menu/MenuSection";
import { FloatingActions } from "@/components/site/FloatingActions";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { LocationSection } from "@/components/site/LocationSection";
import { WhyUs } from "@/components/site/WhyUs";
import { createClient } from "@/utils/supabase/server";
import { normalizeDish, type Dish } from "@/types/dish";

export default async function HomePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dishes")
    .select("*")
    .eq("is_available", true)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    // La carta no debe tumbar la landing: se registra y se muestra vacía.
    console.error("[dishes] no se pudo cargar la carta:", error.message);
  }

  const dishes = ((data as Dish[] | null) ?? []).map(normalizeDish);

  return (
    <>
      <Hero />
      <MenuSection dishes={dishes} />
      <WhyUs />
      <LocationSection />
      <Footer />
      <FloatingActions />
    </>
  );
}
