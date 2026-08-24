import { categorySlug } from "@/components/menu/grouping";

/**
 * Índice de categorías pegado bajo la cabecera de /carta.
 * Son anclas normales: funcionan sin JavaScript.
 */
export function CategoryNav({ categories }: { categories: string[] }) {
  if (categories.length < 2) return null;

  return (
    <nav
      aria-label="Categorías de la carta"
      className="sticky top-16 z-40 -mx-4 mb-12 border-b border-dark/10 bg-light/95 px-4 py-3 backdrop-blur"
    >
      <ul className="flex gap-2 overflow-x-auto">
        {categories.map((category) => (
          <li key={category}>
            <a
              href={`#${categorySlug(category)}`}
              className="block whitespace-nowrap rounded-full border border-dark/15 px-4 py-1.5 text-sm font-semibold text-dark/70 transition-colors hover:border-primary hover:bg-primary hover:text-white"
            >
              {category}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
