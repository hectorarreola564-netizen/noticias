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
      imageUrl: null,
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


describe("parseFeed · imágenes", () => {
  const fuente: FeedSource = { ...jornada, id: "x", name: "X" };

  function conItem(extra: string) {
    return `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel><item>
    <title>Una nota</title>
    <link>https://ejemplo.com/n/1</link>
    <pubDate>Mon, 16 Nov 2026 10:19:11 GMT</pubDate>
    ${extra}
  </item></channel>
</rss>`;
  }

  it("toma la url de media:content", () => {
    // Formato real de El Financiero e Infobae.
    const xml = conItem('<media:content url="https://cdn.ejemplo.com/foto.png" type="image/png" width="1776"/>');
    expect(parseFeed(xml, fuente)[0].imageUrl).toBe("https://cdn.ejemplo.com/foto.png");
  });

  it("toma la url de media:thumbnail", () => {
    // Formato real de BBC Mundo.
    const xml = conItem('<media:thumbnail width="240" height="135" url="https://ichef.bbci.co.uk/a.jpg"/>');
    expect(parseFeed(xml, fuente)[0].imageUrl).toBe("https://ichef.bbci.co.uk/a.jpg");
  });

  it("ignora los adjuntos que no son imagen", () => {
    const xml = conItem('<enclosure url="https://ejemplo.com/audio.mp3" type="audio/mpeg"/>');
    expect(parseFeed(xml, fuente)[0].imageUrl).toBeNull();
  });

  it("descarta imágenes en http para no romper la página segura", () => {
    const xml = conItem('<media:content url="http://inseguro.com/foto.jpg" type="image/jpeg"/>');
    expect(parseFeed(xml, fuente)[0].imageUrl).toBeNull();
  });

  it("deja la noticia sin imagen cuando el feed no trae ninguna", () => {
    // Caso La Jornada: la nota es válida, solo que sin foto.
    expect(parseFeed(conItem(""), fuente)[0].imageUrl).toBeNull();
  });
});

describe("parseFeed · entidades HTML", () => {
  const fuente: FeedSource = { ...jornada, id: "mw", name: "MarketWatch", lang: "en" };

  function conTitulo(titulo: string) {
    return `<?xml version="1.0"?><rss version="2.0"><channel><item>
      <title><![CDATA[${titulo}]]></title>
      <link>https://ejemplo.com/n/2</link>
      <pubDate>Mon, 16 Nov 2026 10:19:11 GMT</pubDate>
    </item></channel></rss>`;
  }

  it("decodifica entidades hexadecimales del titular", () => {
    // Caso real de MarketWatch: el apóstrofo tipográfico llega como &#x2019;
    const xml = conTitulo("Here&#x2019;s what&#x2019;s proven");
    expect(parseFeed(xml, fuente)[0].title).toBe("Here’s what’s proven");
  });

  it("decodifica entidades decimales y con nombre", () => {
    const xml = conTitulo("Ca&#241;o &amp; furia &lt;hoy&gt;");
    expect(parseFeed(xml, fuente)[0].title).toBe("Caño & furia <hoy>");
  });

  it("deja intacto un titular sin entidades", () => {
    const xml = conTitulo("Un titular normal");
    expect(parseFeed(xml, fuente)[0].title).toBe("Un titular normal");
  });
});
