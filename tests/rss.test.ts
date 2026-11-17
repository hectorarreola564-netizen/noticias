import { describe, expect, it } from "vitest";
import { parseFeed } from "@/lib/rss";
import type { FeedSource } from "@/lib/feeds";

const jornada: FeedSource = {
  id: "jornada-politica",
  name: "La Jornada · Política",
  url: "https://www.jornada.com.mx/rss/politica.xml",
  category: "politica",
  region: "mx",
  lang: "es",
};

// Recortado de la respuesta real de La Jornada (2026-11-16): título con espacios
// sobrantes, link con el parámetro de rastreo ?partner=rss, fecha RFC 822 en GMT.
const RSS_JORNADA = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>La Jornada: Política</title>
    <item>
      <title>Buscan ser candidatos a diputados o alcaldes más de 21 mil morenistas   </title>
      <link>https://www.jornada.com.mx/2026/11/16/politica/007n1pol?partner=rss</link>
      <description>Más de 21 mil personas se inscribieron para competir.</description>
      <pubDate>Mon, 16 Nov 2026 10:19:11 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe("parseFeed", () => {
  it("extrae un item de RSS 2.0 con los datos de su fuente", () => {
    const articles = parseFeed(RSS_JORNADA, jornada);

    expect(articles).toHaveLength(1);
    expect(articles[0]).toEqual({
      title: "Buscan ser candidatos a diputados o alcaldes más de 21 mil morenistas",
      url: "https://www.jornada.com.mx/2026/11/16/politica/007n1pol",
      summary: "Más de 21 mil personas se inscribieron para competir.",
      sourceId: "jornada-politica",
      sourceName: "La Jornada · Política",
      category: "politica",
      region: "mx",
      lang: "es",
      publishedAt: new Date("2026-11-16T10:19:11.000Z"),
    });
  });

  it("devuelve una lista vacía en vez de lanzar cuando el XML está roto", () => {
    const roto = '<?xml version="1.0"?><rss><channel><item><title>sin cerrar';

    expect(() => parseFeed(roto, jornada)).not.toThrow();
    expect(parseFeed(roto, jornada)).toEqual([]);
  });

  it("descarta items sin título o sin link, y conserva los buenos del mismo feed", () => {
    const mixto = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Nota buena</title>
      <link>https://www.jornada.com.mx/2026/11/16/politica/001</link>
      <pubDate>Mon, 16 Nov 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <link>https://www.jornada.com.mx/2026/11/16/politica/002</link>
      <pubDate>Mon, 16 Nov 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Nota sin link</title>
      <pubDate>Mon, 16 Nov 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Nota con link basura</title>
      <link>no-es-una-url</link>
      <pubDate>Mon, 16 Nov 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    const articles = parseFeed(mixto, jornada);

    expect(articles.map((a) => a.title)).toEqual(["Nota buena"]);
  });

  it("descarta items cuya fecha no se puede interpretar", () => {
    const sinFecha = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Nota sin fecha legible</title>
      <link>https://www.jornada.com.mx/2026/11/16/politica/003</link>
      <pubDate>ayer por la tarde</pubDate>
    </item>
  </channel>
</rss>`;

    expect(parseFeed(sinFecha, jornada)).toEqual([]);
  });

  it("parsea feeds en formato Atom además de RSS 2.0", () => {
    const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Ejemplo Atom</title>
  <entry>
    <title>Titular en Atom</title>
    <link rel="alternate" href="https://example.com/nota-atom"/>
    <updated>2026-11-16T10:19:11Z</updated>
    <summary>Resumen del Atom.</summary>
  </entry>
</feed>`;

    const articles = parseFeed(atom, jornada);

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("Titular en Atom");
    expect(articles[0].url).toBe("https://example.com/nota-atom");
    expect(articles[0].summary).toBe("Resumen del Atom.");
    expect(articles[0].publishedAt).toEqual(new Date("2026-11-16T10:19:11.000Z"));
  });

  it("deja el resumen en texto plano, sin etiquetas HTML ni espacios colapsables", () => {
    const conHtml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Nota con HTML</title>
      <link>https://example.com/html</link>
      <pubDate>Mon, 16 Nov 2026 10:00:00 GMT</pubDate>
      <description>&lt;p&gt;El peso cerró &lt;b&gt;arriba&lt;/b&gt;.&lt;/p&gt;&lt;p&gt;Segundo   párrafo.&lt;/p&gt;</description>
    </item>
  </channel>
</rss>`;

    const articles = parseFeed(conHtml, jornada);

    expect(articles[0].summary).toBe("El peso cerró arriba. Segundo párrafo.");
  });

  it("descarta los items índice que algunos medios publican como si fueran nota", () => {
    // Infobae publica una entrada por día cuyo titular es solo la fecha. No es una
    // noticia y en el feed se ve como un error.
    const indice = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Martes, 17 de noviembre de 2026 (02:00 GMT)</title>
      <link>https://www.infobae.com/indice-2026-11-17</link>
      <pubDate>Mon, 16 Nov 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Sheinbaum presenta el presupuesto de 2027</title>
      <link>https://www.infobae.com/nota-real</link>
      <pubDate>Mon, 16 Nov 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    const articles = parseFeed(indice, jornada);

    expect(articles.map((a) => a.title)).toEqual(["Sheinbaum presenta el presupuesto de 2027"]);
  });

  it("desenvuelve el CDATA que algunos medios dejan doble-escapado", () => {
    // Excélsior publica el título y el resumen como &lt;![CDATA[...]]&gt;, así que
    // al decodificar la entidad queda el envoltorio como texto literal dentro del
    // valor. Sin desenvolverlo, el titular sale con "<![CDATA[" a la vista y la
    // limpieza de HTML se come el resumen entero por parecerle una etiqueta.
    const excelsior = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>&lt;![CDATA[Presumen detención de un líder del Cártel del Golfo]]&gt;</title>
      <link>https://www.excelsior.com.mx/nacional/presumen-detencion</link>
      <description>&lt;![CDATA[Tras un enfrentamiento con las Fuerzas Armadas fue detenido.]]&gt;</description>
      <pubDate>Mon, 16 Nov 2026 20:49:34 -0600</pubDate>
    </item>
  </channel>
</rss>`;

    const articles = parseFeed(excelsior, jornada);

    expect(articles[0].title).toBe("Presumen detención de un líder del Cártel del Golfo");
    expect(articles[0].summary).toBe("Tras un enfrentamiento con las Fuerzas Armadas fue detenido.");
  });
});

