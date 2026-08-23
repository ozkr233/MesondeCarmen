import { DishCard } from "@/components/menu/DishCard";
import { DEFAULT_GREETING, whatsappLink } from "@/lib/whatsapp";
import type { Dish } from "@/types/dish";

/** Agrupa por categoría conservando el orden en que llegan de la consulta. */
function groupByCategory(dishes: Dish[]): Map<string, Dish[]> {
  const groups = new Map<string, Dish[]>();
  for (const dish of dishes) {
    const key = dish.category?.trim() || "General";
    const current = groups.get(key);
    if (current) current.push(dish);
    else groups.set(key, [dish]);
  }
  return groups;
}

export function MenuSection({ dishes }: { dishes: Dish[] }) {
  const groups = groupByCategory(dishes);

  return (
    <section id="menu" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-4xl font-bold text-primary">
            Pide tu Plato Favorito
          </h2>
          <p className="text-lg text-dark/60">
            Agrega los platos que quieras y envíanos el pedido completo por
            WhatsApp.
          </p>
        </div>

        {dishes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dark/15 py-16 text-center text-dark/50">
            Por ahora no hay platos disponibles. ¡Vuelve pronto!
          </p>
        ) : (
          <div className="space-y-16">
            {[...groups.entries()].map(([category, categoryDishes]) => (
              <div key={category}>
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
        )}

        <div className="mt-12 text-center">
          <p className="mb-4 text-xl font-semibold text-dark/70">
            ¿Prefieres preguntarnos algo antes de pedir?
          </p>
          <a
            href={whatsappLink(DEFAULT_GREETING)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg border-2 border-whatsapp-dark px-8 py-3 font-bold uppercase text-whatsapp-dark transition-all hover:bg-whatsapp-dark hover:text-white"
          >
            Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
