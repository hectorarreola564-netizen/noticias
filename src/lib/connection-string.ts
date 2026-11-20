/**
 * Normaliza la cadena de conexión de Postgres antes de dársela al driver.
 *
 * Motivo: la contraseña de Supabase puede traer caracteres que son separadores
 * dentro de una URL (`@`, `?`, `#`, `/`). Si se pega cruda, el parser corta en
 * el primer `@` y el driver falla con "Invalid URL". Si se pega codificada,
 * funciona. Esta función acepta las dos formas y produce siempre la válida,
 * para que configurar la variable en un panel web no dependa de que el humano
 * recuerde codificar nada.
 *
 * También tolera comillas y espacios sobrantes, que es lo que queda cuando se
 * copia una línea entera de un archivo .env en un formulario.
 */
export function normalizarCadenaConexion(cruda: string | undefined): string | undefined {
  if (!cruda) return cruda;

  let url = cruda.trim();
  // Un .env pegado entero deja las comillas y, a veces, el nombre de la variable.
  url = url.replace(/^DATABASE_URL(_POOLED)?\s*=\s*/, "");
  if ((url.startsWith("'") && url.endsWith("'")) || (url.startsWith('"') && url.endsWith('"'))) {
    url = url.slice(1, -1);
  }

  const sep = url.indexOf("://");
  if (sep === -1) return url;

  const esquema = url.slice(0, sep + 3);
  const resto = url.slice(sep + 3);

  // El separador real entre credenciales y servidor es el ÚLTIMO @: cualquier
  // @ anterior pertenece a la contraseña.
  const corte = resto.lastIndexOf("@");
  if (corte === -1) return url;

  const credenciales = resto.slice(0, corte);
  const servidor = resto.slice(corte + 1);

  const dosPuntos = credenciales.indexOf(":");
  if (dosPuntos === -1) return url;

  const usuario = credenciales.slice(0, dosPuntos);
  const contraseña = credenciales.slice(dosPuntos + 1);

  // Decodificar primero evita codificar dos veces una contraseña que ya venía bien.
  let plana = contraseña;
  try {
    plana = decodeURIComponent(contraseña);
  } catch {
    // Secuencias % inválidas: se trata como texto plano.
  }

  return `${esquema}${usuario}:${encodeURIComponent(plana)}@${servidor}`;
}
