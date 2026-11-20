import { describe, expect, it } from "vitest";
import { normalizarCadenaConexion } from "@/lib/connection-string";

const HOST = "aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const USUARIO = "postgres.ewmvawuhalklicscrxre";

describe("normalizarCadenaConexion", () => {
  it("codifica una contraseña pegada en crudo con @ y ?", () => {
    // El caso real: se pega la contraseña tal cual en el panel de Vercel y el
    // primer @ parte la URL, de ahí el "Invalid URL" del driver.
    const cruda = `postgresql://${USUARIO}:ab@c?ss12345@${HOST}`;
    expect(normalizarCadenaConexion(cruda)).toBe(
      `postgresql://${USUARIO}:ab%40c%3Fss12345@${HOST}`,
    );
  });

  it("deja intacta una contraseña que ya venía codificada", () => {
    const buena = `postgresql://${USUARIO}:ab%40c%3Fss12345@${HOST}`;
    expect(normalizarCadenaConexion(buena)).toBe(buena);
  });

  it("quita las comillas y el nombre de variable de una línea de .env", () => {
    const linea = `DATABASE_URL='postgresql://${USUARIO}:simple123@${HOST}'`;
    expect(normalizarCadenaConexion(linea)).toBe(
      `postgresql://${USUARIO}:simple123@${HOST}`,
    );
  });

  it("quita espacios y saltos de línea sobrantes", () => {
    const sucia = `  postgresql://${USUARIO}:simple123@${HOST}\n`;
    expect(normalizarCadenaConexion(sucia)).toBe(
      `postgresql://${USUARIO}:simple123@${HOST}`,
    );
  });

  it("devuelve undefined cuando no hay variable", () => {
    expect(normalizarCadenaConexion(undefined)).toBeUndefined();
  });
});
