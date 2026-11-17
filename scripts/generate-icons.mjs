/**
 * Genera los PNG del icono sin dependencias externas (zlib viene en Node). iOS
 * exige PNG para el icono de pantalla de inicio: un SVG en el manifest no sirve.
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const COLORS = {
  fondo: [0x11, 0x16, 0x1c],
  acento: [0x4a, 0x9e, 0xff],
  claro: [0xe8, 0xea, 0xed],
  apagado: [0x9a, 0xa4, 0xaf],
};

// Rectángulos en coordenadas relativas (0..1): un bloque de foto y las líneas de
// un titular. Se ve como una nota de periódico incluso a 60 px.
const SHAPES = [
  { x: [0.14, 0.45], y: [0.17, 0.43], color: "acento" },
  { x: [0.52, 0.86], y: [0.19, 0.235], color: "claro" },
  { x: [0.52, 0.86], y: [0.27, 0.315], color: "claro" },
  { x: [0.52, 0.74], y: [0.35, 0.395], color: "apagado" },
  { x: [0.14, 0.86], y: [0.55, 0.60], color: "claro" },
  { x: [0.14, 0.86], y: [0.65, 0.70], color: "apagado" },
  { x: [0.14, 0.62], y: [0.75, 0.80], color: "apagado" },
];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  // Una scanline por fila: 1 byte de filtro (0 = sin filtro) + RGB por pixel.
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      let color = COLORS.fondo;
      for (const shape of SHAPES) {
        const inX = x >= shape.x[0] * size && x < shape.x[1] * size;
        const inY = y >= shape.y[0] * size && y < shape.y[1] * size;
        if (inX && inY) color = COLORS[shape.color];
      }
      const i = y * stride + 1 + x * 3;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bits por canal
  ihdr[9] = 2;  // color type 2 = RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  const file = `public/icons/icon-${size}.png`;
  writeFileSync(file, png(size));
  console.log(`escrito ${file}`);
}
