import { describe, expect, it } from "vitest";
import { dedupe, spreadSources, withinWindow } from "@/lib/normalize";
import type { ArticleInput } from "@/lib/rss";

function articulo(overrides: Partial<ArticleInput> = {}): ArticleInput {
  return {
    title: "Titular cualquiera",
    url: "https://example.com/a",
    summary: "",
    sourceId: "jornada-politica",
    sourceName: "La Jornada · Política",
    category: "politica",
    region: "mx",
    lang: "es",
    publishedAt: new Date("2026-11-16T10:00:00Z"),
    ...overrides,
  };
}

describe("dedupe", () => {
  it("colapsa dos entradas que apuntan a la misma URL", () => {
    const articles = [
      articulo({ url: "https://example.com/nota-1", title: "Primera versión" }),
      articulo({ url: "https://example.com/nota-1", title: "Segunda versión" }),
    ];

    const result = dedupe(articles);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Primera versión");
  });

  it("colapsa el mismo titular publicado por dos medios distintos", () => {
    const articles = [
      articulo({ url: "https://a.com/x", sourceId: "jornada-politica", title: "Sheinbaum presenta el presupuesto" }),
      articulo({ url: "https://b.com/y", sourceId: "infobae-mexico", title: "Sheinbaum presenta el presupuesto" }),
    ];

    expect(dedupe(articles)).toHaveLength(1);
  });

  it("trata como igual un titular que solo difiere en mayúsculas o espacios", () => {
    const articles = [
      articulo({ url: "https://a.com/x", title: "El peso cierra a la baja" }),
      articulo({ url: "https://b.com/y", title: "EL PESO   CIERRA A LA BAJA" }),
    ];

    expect(dedupe(articles)).toHaveLength(1);
  });

  it("conserva noticias que de verdad son distintas", () => {
    const articles = [
      articulo({ url: "https://a.com/x", title: "Primera noticia" }),
      articulo({ url: "https://b.com/y", title: "Segunda noticia" }),
    ];

    expect(dedupe(articles)).toHaveLength(2);
  });
});

describe("withinWindow", () => {
  const ahora = new Date("2026-11-16T12:00:00Z");

  it("conserva lo publicado hoy y en los últimos 7 días", () => {
    const articles = [
      articulo({ url: "https://a.com/1", title: "De hoy", publishedAt: new Date("2026-11-16T09:00:00Z") }),
      articulo({ url: "https://a.com/2", title: "De hace 3 días", publishedAt: new Date("2026-11-13T09:00:00Z") }),
      articulo({ url: "https://a.com/3", title: "De hace 6 días", publishedAt: new Date("2026-11-10T13:00:00Z") }),
    ];

    expect(withinWindow(articles, ahora)).toHaveLength(3);
  });

  it("descarta lo más viejo que 7 días", () => {
    const articles = [
      articulo({ url: "https://a.com/1", title: "De hoy", publishedAt: new Date("2026-11-16T09:00:00Z") }),
      articulo({ url: "https://a.com/2", title: "De hace 8 días", publishedAt: new Date("2026-11-08T09:00:00Z") }),
    ];

    expect(withinWindow(articles, ahora).map((a) => a.title)).toEqual(["De hoy"]);
  });

  it("descarta fechas absurdamente futuras para que no se claven arriba del feed", () => {
    const articles = [
      articulo({ url: "https://a.com/1", title: "De hoy", publishedAt: new Date("2026-11-16T09:00:00Z") }),
      articulo({ url: "https://a.com/2", title: "Del año que viene", publishedAt: new Date("2027-03-01T09:00:00Z") }),
    ];

    expect(withinWindow(articles, ahora).map((a) => a.title)).toEqual(["De hoy"]);
  });

  it("tolera un adelanto de pocas horas, que suele ser un desfase de zona horaria", () => {
    const articles = [
      articulo({ url: "https://a.com/1", title: "Adelantada 2 horas", publishedAt: new Date("2026-11-16T14:00:00Z") }),
    ];

    expect(withinWindow(articles, ahora)).toHaveLength(1);
  });
});

describe("spreadSources", () => {
  it("impide que un solo medio acapare la parte alta del feed", () => {
    // Infobae publica ~100 notas al día con fechas muy frescas: en orden
    // estrictamente cronológico se come la primera pantalla completa.
    const articles = [
      articulo({ url: "https://i.com/1", title: "Infobae 1", sourceId: "infobae-mexico" }),
      articulo({ url: "https://i.com/2", title: "Infobae 2", sourceId: "infobae-mexico" }),
      articulo({ url: "https://i.com/3", title: "Infobae 3", sourceId: "infobae-mexico" }),
      articulo({ url: "https://i.com/4", title: "Infobae 4", sourceId: "infobae-mexico" }),
      articulo({ url: "https://j.com/1", title: "Jornada 1", sourceId: "jornada-politica" }),
    ];

    const result = spreadSources(articles, 2);

    expect(result.slice(0, 3).map((a) => a.title)).toEqual([
      "Infobae 1",
      "Infobae 2",
      "Jornada 1",
    ]);
  });

  it("no pierde ni inventa notas, solo las reordena", () => {
    const articles = [
      articulo({ url: "https://i.com/1", title: "A", sourceId: "infobae-mexico" }),
      articulo({ url: "https://i.com/2", title: "B", sourceId: "infobae-mexico" }),
      articulo({ url: "https://i.com/3", title: "C", sourceId: "infobae-mexico" }),
      articulo({ url: "https://j.com/1", title: "D", sourceId: "jornada-politica" }),
    ];

    const result = spreadSources(articles, 2);

    expect(result).toHaveLength(4);
    expect(result.map((a) => a.title).sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("deja el orden intacto cuando ningún medio se repite de más", () => {
    const articles = [
      articulo({ url: "https://a.com/1", title: "A", sourceId: "jornada-politica" }),
      articulo({ url: "https://b.com/1", title: "B", sourceId: "infobae-mexico" }),
      articulo({ url: "https://c.com/1", title: "C", sourceId: "thehill" }),
    ];

    expect(spreadSources(articles, 2).map((a) => a.title)).toEqual(["A", "B", "C"]);
  });
});

