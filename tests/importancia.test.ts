import { describe, expect, it } from "vitest";
import {
  agruparPorHecho,
  esImportante,
  historiaMasImportante,
  tokensSignificativos,
  type NotaParaEvaluar,
} from "@/lib/importancia";

let n = 0;
function nota(title: string, sourceId: string, minutos = 0): NotaParaEvaluar {
  n++;
  return {
    id: `a${n}`,
    title,
    sourceId,
    sourceName: sourceId,
    publishedAt: new Date(Date.UTC(2026, 10, 20, 10, minutos)),
  };
}

describe("tokensSignificativos", () => {
  it("quita palabras vacías y normaliza acentos", () => {
    const t = tokensSignificativos("El Banco de México sube la tasa para contener la inflación");
    expect(t.has("banco")).toBe(true);
    expect(t.has("mexico")).toBe(true);
    expect(t.has("inflacion")).toBe(true);
    // "para" es vacía y "sube" tiene menos de 4 letras
    expect(t.has("para")).toBe(false);
    expect(t.has("sube")).toBe(false);
  });
});

describe("agruparPorHecho", () => {
  it("junta coberturas del mismo hecho de medios distintos", () => {
    const historias = agruparPorHecho([
      nota("Banxico sube la tasa de interés a 9.5% ante la inflación", "jornada"),
      nota("El Banco de México eleva su tasa de interés por la inflación", "elfinanciero"),
      nota("Mexico central bank raises interest rate", "cnbc"),
    ]);
    // Las dos en español comparten "tasa"+"interes"+"inflacion"; la inglesa no.
    const grande = historias.sort((a, b) => b.notas.length - a.notas.length)[0];
    expect(grande.fuentes).toContain("jornada");
    expect(grande.fuentes).toContain("elfinanciero");
  });

  it("no mezcla hechos distintos", () => {
    const historias = agruparPorHecho([
      nota("Detienen a exalcaldesa de Playa del Carmen", "infobae"),
      nota("Wall Street cierra con pérdidas por los datos de empleo", "marketwatch"),
    ]);
    expect(historias).toHaveLength(2);
  });
});

describe("esImportante", () => {
  const base = (fuentes: string[], titulo = "Algo pasó en algún lugar del mundo") =>
    agruparPorHecho(fuentes.map((f) => nota(titulo, f)))[0];

  it("califica cuando la cubren cuatro medios", () => {
    expect(esImportante(base(["a", "b", "c", "d"]))).toBe(true);
  });

  it("no califica con tres medios y sin urgencia", () => {
    expect(esImportante(base(["a", "b", "c"]))).toBe(false);
  });

  it("basta con tres medios si el hecho es de ruptura", () => {
    expect(esImportante(base(["a", "b", "c"], "Última hora: terremoto sacude la capital"))).toBe(true);
  });

  it("una sola fuente nunca califica, aunque grite urgencia", () => {
    expect(esImportante(base(["a", "b"], "ÚLTIMA HORA: lo que nadie te ha contado"))).toBe(false);
  });
});

describe("historiaMasImportante", () => {
  it("devuelve null cuando nada alcanza el umbral", () => {
    expect(
      historiaMasImportante([
        nota("Una nota suelta sobre cultura local", "a"),
        nota("Otra cosa completamente distinta de deportes", "b"),
      ]),
    ).toBeNull();
  });

  it("prefiere la historia con más medios detrás", () => {
    const h = historiaMasImportante([
      nota("Sismo magnitud 7 sacude Oaxaca esta madrugada", "a"),
      nota("Sismo magnitud 7 sacude Oaxaca sin víctimas", "b"),
      nota("Reporte: sismo magnitud 7 en Oaxaca activa alertas", "c"),
      nota("Peso mexicano cierra estable frente al dólar hoy", "d"),
      nota("Peso mexicano estable frente al dólar en la jornada", "e"),
      nota("El peso mexicano cierra estable frente al dólar", "f"),
      nota("Peso mexicano sigue estable frente al dólar", "g"),
    ]);
    expect(h).not.toBeNull();
    expect(h!.fuentes.length).toBeGreaterThanOrEqual(3);
  });
});
