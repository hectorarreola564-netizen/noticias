type Props = {
  title: string;
  url: string;
  summary: string;
  sourceName: string;
  publishedAt: Date;
  lang: string;
};

function hora(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(date);
}

/**
 * Titular, resumen corto, medio y enlace: nada más. El cuerpo del artículo se lee
 * en el sitio del medio, que es lo que hace de esto un agregador legítimo y no una
 * copia. Ver la sección "Modelo legal" del spec.
 */
export function ArticleCard(props: Props) {
  return (
    <article className="border-b border-(--color-borde) py-4">
      <a
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block active:opacity-60"
      >
        <div className="mb-1 flex items-center gap-2 text-xs text-(--color-apagado)">
          <span className="font-medium text-(--color-acento)">{props.sourceName}</span>
          <span>·</span>
          <time dateTime={props.publishedAt.toISOString()}>{hora(props.publishedAt)}</time>
          {props.lang === "en" && (
            <span className="rounded border border-(--color-borde) px-1">EN</span>
          )}
        </div>
        <h2 className="text-[17px] leading-snug font-semibold text-balance">{props.title}</h2>
        {props.summary && (
          <p className="mt-1 line-clamp-2 text-sm text-(--color-apagado)">{props.summary}</p>
        )}
      </a>
    </article>
  );
}
