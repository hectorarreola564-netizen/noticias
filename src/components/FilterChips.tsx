import Link from "next/link";
import { CATEGORIES } from "@/lib/query";

/**
 * Filtros como enlaces, no como estado de cliente: así la app no necesita
 * JavaScript para filtrar y cada vista tiene su propia URL compartible.
 */
export function FilterChips({ active, day }: { active: string; day: number }) {
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3">
      {CATEGORIES.map((c) => {
        const selected = c.id === active;
        const params = new URLSearchParams();
        if (c.id !== "todo") params.set("c", c.id);
        if (day !== 0) params.set("d", String(day));
        const href = params.size > 0 ? `/?${params}` : "/";

        return (
          <Link
            key={c.id}
            href={href}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              selected
                ? "border-(--color-acento) bg-(--color-acento)/15 text-(--color-acento)"
                : "border-(--color-borde) text-(--color-apagado)"
            }`}
          >
            {c.label}
          </Link>
        );
      })}
    </nav>
  );
}
