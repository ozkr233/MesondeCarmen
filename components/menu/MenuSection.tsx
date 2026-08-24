import Link from "next/link";

import { CategoryNav } from "@/components/menu/CategoryNav";
import { DishCard } from "@/components/menu/DishCard";
import { categorySlug, groupByCategory } from "@/components/menu/grouping";
import { WhatsAppLink } from "@/components/site/WhatsAppLink";
import type { Dish } from "@/types/dish";

type Variant = "destacados" | "completa";

const copy: Record<Variant, { title: string; subtitle: string }> = {
  destacados: {
    title: "Nuestros Platos Estrella",
    subtitle:
      "Los favoritos de la casa. Agrégalos al pedido o mira la carta completa.",
  },
  completa: {
    title: "Nuestra Carta",
    subtitle:
      "Todo lo que preparamos hoy. Agrega lo que quieras y envíanos el pedido por WhatsApp.",
  },
};

export function MenuSection({
  dishes,
  variant = "completa",
}: {
  dishes: Dish[];
  variant?: Variant;
}) {
  const groups = groupByCategory(dishes);
  const isFeatured = variant === "destacados";
  const { title, subtitle } = copy[variant];
  // En la portada el <h1> lo pone el Hero, así que aquí es un <h2>. En /carta
  // no hay hero: este es el encabezado principal de la página.
  const Title = isFeatured ? "h2" : "h1";

  return (
    <section id="menu" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <Title className="mb-3 text-4xl font-bold text-primary">
            {title}
          </Title>
          <p className="text-lg text-dark/60">{subtitle}</p>
        </div>

        {dishes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dark/15 py-16 text-center text-dark/50">
            Por ahora no hay platos disponibles. ¡Vuelve pronto!
          </p>
        ) : isFeatured ? (
          // En la portada los destacados van en una sola grilla, sin encabezados
          // de categoría: son pocos y el objetivo es que se vean como escaparate.
          <div className="grid gap-8 md:grid-cols-3">
            {dishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        ) : (
          <>
            <CategoryNav categories={groups.map(([category]) => category)} />
            <div className="space-y-16">
              {groups.map(([category, categoryDishes]) => (
                <div
                  key={category}
                  id={categorySlug(category)}
                  className="scroll-mt-32"
                >
                  <h3 className="mb-8 flex items-center gap-4 text-2xl font-bold uppercase tracking-wide text-dark">
                    <span className="whitespace-nowrap">{category}</span>
                    <span className="h-px flex-1 bg-dark/10" />
                  </h3>
                  <div className="grid gap-8 md:grid-cols-3">
                    {categoryDishes.map((dish) => (
                      <DishCard key={dish.id} dish={dish} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 text-center">
          {isFeatured ? (
            <>
              <p className="mb-4 text-xl font-semibold text-dark/70">
                ¿Prefieres otro plato de nuestra carta?
              </p>
              <Link
                href="/carta"
                className="inline-block rounded-lg bg-primary px-8 py-4 font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary-dark"
              >
                Ver carta completa
              </Link>
            </>
          ) : (
            <>
              <p className="mb-4 text-xl font-semibold text-dark/70">
                ¿Prefieres preguntarnos algo antes de pedir?
              </p>
              <WhatsAppLink
                origen="carta"
                className="inline-block rounded-lg border-2 border-whatsapp-dark px-8 py-3 font-bold uppercase text-whatsapp-dark transition-all hover:bg-whatsapp-dark hover:text-white"
              >
                Escríbenos por WhatsApp
              </WhatsAppLink>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
