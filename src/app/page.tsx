import { ArticleCard } from "@/components/ArticleCard";
import { DayNav } from "@/components/DayNav";
import { FilterChips } from "@/components/FilterChips";
import { articlesFor, clampOffset } from "@/lib/query";

type Props = {
  searchParams: Promise<{ c?: string; d?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const day = clampOffset(params.d);
  const category = params.c ?? "todo";

  let articles: Awaited<ReturnType<typeof articlesFor>> = [];
  let dbError: string | null = null;
  try {
    articles = await articlesFor(day, category);
  } catch (error) {
    // Antes de conectar Supabase la portada no debe reventar con un stack trace:
    // decir qué falta es más útil que un error 500.
    dbError = error instanceof Error ? error.message : String(error);
  }

  return (
    <main>
      <header className="pt-6">
        <h1 className="text-2xl font-bold tracking-tight">Noticias</h1>
      </header>

      <FilterChips active={category} day={day} />
      <DayNav day={day} category={category} />

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

      {!dbError && articles.length === 0 && (
        <div className="rounded-lg border border-(--color-borde) bg-(--color-tarjeta) p-4 text-sm">
          <p className="font-semibold">Nada todavía para este día.</p>
          <p className="mt-1 text-(--color-apagado)">
            La sincronización corre cada 15 minutos. Para forzarla ahora, ver el paso 4 del README.
          </p>
        </div>
      )}

      <div>
        {articles.map((a) => (
          <ArticleCard
            key={a.id}
            title={a.title}
            url={a.url}
            summary={a.summary}
            sourceName={a.sourceName}
            publishedAt={a.publishedAt}
            lang={a.lang}
          />
        ))}
      </div>
    </main>
  );
}
