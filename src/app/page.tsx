import { ArticleCard } from "@/components/ArticleCard";
import { DayNav } from "@/components/DayNav";
import { FilterChips } from "@/components/FilterChips";
import { PushButton } from "@/components/PushButton";
import { clampOffset, portadaFor, type Portada } from "@/lib/query";

type Props = {
  searchParams: Promise<{ c?: string; d?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const day = clampOffset(params.d);
  const category = params.c ?? "todo";

  let portada: Portada = { destacadas: [], resto: [] };
  let dbError: string | null = null;
  try {
    portada = await portadaFor(day, category);
  } catch (error) {
    // Antes de conectar Supabase la portada no debe reventar con un stack trace:
    // decir qué falta es más útil que un error 500.
    dbError = error instanceof Error ? error.message : String(error);
  }

  return (
    <main>
      {/* Cabecera fija: al desplazarse, los filtros y los días siguen al alcance
          del pulgar en lugar de obligar a subir hasta arriba. */}
      <div className="sticky top-0 z-10 -mx-4 bg-(--color-fondo)/85 px-4 backdrop-blur-xl">
        <header className="flex items-baseline justify-between pt-6">
          <h1 className="text-2xl font-bold tracking-tight">Noticias</h1>
          <PushButton vapidKey={process.env.VAPID_PUBLIC_KEY ?? ""} />
        </header>

        <FilterChips active={category} day={day} />
        <DayNav day={day} category={category} />
      </div>

      {dbError && (
        <div className="rounded-lg border border-(--color-borde) bg-(--color-tarjeta) p-4 text-sm">
          <p className="font-semibold">No hay conexión a la base de datos.</p>
          <p className="mt-1 text-(--color-apagado)">
            Revisa <code>DATABASE_URL</code> (paso 2 del README). Error recibido:
          </p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-(--color-apagado)">
            {dbError}
          </pre>
        </div>
      )}

      {!dbError && portada.destacadas.length === 0 && portada.resto.length === 0 && (
        <div className="rounded-lg border border-(--color-borde) bg-(--color-tarjeta) p-4 text-sm">
          <p className="font-semibold">Nada todavía para este día.</p>
          <p className="mt-1 text-(--color-apagado)">
            La sincronización corre cada 15 minutos. Para forzarla ahora, ver el paso 4 del README.
          </p>
        </div>
      )}

      {portada.destacadas.length > 0 && (
        <section>
          <h2 className="pt-2 pb-1 text-xs font-bold tracking-widest text-(--color-apagado) uppercase">
            Lo importante
          </h2>
          {portada.destacadas.map((d, i) => (
            <ArticleCard
              key={d.articulo.id}
              title={d.articulo.title}
              url={d.articulo.url}
              summary={d.articulo.summary}
              sourceName={d.articulo.sourceName}
              publishedAt={d.articulo.publishedAt}
              lang={d.articulo.lang}
              imageUrl={d.articulo.imageUrl}
              medios={d.medios}
              // Solo la primera va en grande; varias seguidas cansan la vista.
              destacada={i === 0}
            />
          ))}
        </section>
      )}

      {portada.resto.length > 0 && (
        <section>
          <h2 className="pt-5 pb-1 text-xs font-bold tracking-widest text-(--color-apagado) uppercase">
            Lo más reciente
          </h2>
          {portada.resto.map((a) => (
            <ArticleCard
              key={a.id}
              title={a.title}
              url={a.url}
              summary={a.summary}
              sourceName={a.sourceName}
              publishedAt={a.publishedAt}
              lang={a.lang}
              imageUrl={a.imageUrl}
            />
          ))}
        </section>
      )}
    </main>
  );
}
