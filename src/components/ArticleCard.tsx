type Props = {
  title: string;
  url: string;
  summary: string;
  sourceName: string;
  publishedAt: Date;
  lang: string;
  imageUrl: string | null;
  /** La primera nota del día con foto se muestra en grande, como portada. */
  destacada?: boolean;
};

function hora(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(date);
}

function Meta({ sourceName, publishedAt, lang }: Pick<Props, "sourceName" | "publishedAt" | "lang">) {
  return (
    <div className="flex items-center gap-2 text-xs text-(--color-apagado)">
      <span className="font-semibold text-(--color-acento)">{sourceName}</span>
      <span aria-hidden>·</span>
      <time dateTime={publishedAt.toISOString()}>{hora(publishedAt)}</time>
      {lang === "en" && (
        <span className="rounded-full border border-(--color-borde) px-1.5 py-px text-[10px] font-medium">
          EN
        </span>
      )}
    </div>
  );
}

/**
 * Las fotos se cargan directo del CDN del medio con <img>, no con next/image: el
 * optimizador de Vercel consume cuota del plan gratuito y la regla del proyecto es
 * que nada pueda generar cobro. referrerPolicy evita que algunos CDN las bloqueen
 * al venir de otro dominio.
 */
function Foto({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`bg-(--color-tarjeta) object-cover ${className}`}
    />
  );
}

/**
 * Titular, resumen corto, medio, foto y enlace: nada más. El cuerpo del artículo se
 * lee en el sitio del medio, que es lo que hace de esto un agregador legítimo y no
 * una copia. Ver la sección "Modelo legal" del spec.
 */
export function ArticleCard(props: Props) {
  const enlace = {
    href: props.url,
    target: "_blank",
    rel: "noopener noreferrer",
  } as const;

  if (props.destacada && props.imageUrl) {
    return (
      <article className="border-b border-(--color-borde) py-4">
        <a {...enlace} className="block active:opacity-60">
          <Foto src={props.imageUrl} alt={props.title} className="mb-3 aspect-[16/9] w-full rounded-xl" />
          <Meta {...props} />
          <h2 className="mt-1.5 text-xl leading-tight font-bold text-balance">{props.title}</h2>
          {props.summary && (
            <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-(--color-apagado)">
              {props.summary}
            </p>
          )}
        </a>
      </article>
    );
  }

  return (
    <article className="border-b border-(--color-borde) py-4">
      <a {...enlace} className="flex gap-3 active:opacity-60">
        <div className="min-w-0 flex-1">
          <Meta {...props} />
          <h2 className="mt-1 text-[17px] leading-snug font-semibold text-pretty">{props.title}</h2>
          {props.summary && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-(--color-apagado)">
              {props.summary}
            </p>
          )}
        </div>
        {props.imageUrl && (
          <Foto
            src={props.imageUrl}
            alt={props.title}
            className="h-20 w-20 shrink-0 rounded-lg sm:h-24 sm:w-24"
          />
        )}
      </a>
    </article>
  );
}
