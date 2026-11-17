import Link from "next/link";
import { WINDOW_DAYS } from "@/lib/normalize";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function etiqueta(offset: number): string {
  if (offset === 0) return "Hoy";
  if (offset === 1) return "Ayer";
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return DIAS[d.getDay()];
}

/** Los 7 días que la app guarda. Más atrás no hay nada: la ingesta purga. */
export function DayNav({ day, category }: { day: number; category: string }) {
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
      {Array.from({ length: WINDOW_DAYS }, (_, offset) => {
        const selected = offset === day;
        const params = new URLSearchParams();
        if (category !== "todo") params.set("c", category);
        if (offset !== 0) params.set("d", String(offset));
        const href = params.size > 0 ? `/?${params}` : "/";

        return (
          <Link
            key={offset}
            href={href}
            className={`shrink-0 text-sm capitalize ${
              selected ? "font-semibold text-(--color-texto)" : "text-(--color-apagado)"
            }`}
          >
            {etiqueta(offset)}
          </Link>
        );
      })}
    </nav>
  );
}
