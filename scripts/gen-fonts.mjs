import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "../artifacts/transyachtgroup/public/fonts");
const OUT = path.join(__dirname, "../artifacts/api-server/src/documents/core/fonts.generated.ts");

function b64(filename) {
  return fs.readFileSync(path.join(FONTS_DIR, filename)).toString("base64");
}

const faces = [
  { family: "Porter FT",           weight: 400, fmt: "woff2",     mime: "font/woff2", file: "PorterFT-Regular_1774708404403.woff2" },
  { family: "Porter FT",           weight: 600, fmt: "woff2",     mime: "font/woff2", file: "PorterFT-SemiBold_1774708404404.woff2" },
  { family: "Wix MadeFor Display", weight: 400, fmt: "woff2",     mime: "font/woff2", file: "WixMadeforDisplay-Regular_1774708404406.woff2" },
  { family: "Wix MadeFor Display", weight: 600, fmt: "woff2",     mime: "font/woff2", file: "WixMadeforDisplay-SemiBold_1774708404407.woff2" },
  { family: "Wix MadeFor Display", weight: 700, fmt: "woff2",     mime: "font/woff2", file: "WixMadeforDisplay-Bold_1774708404405.woff2" },
  { family: "Kalissa",             weight: 400, fmt: "woff2",     mime: "font/woff2", file: "KalissaRegular.woff2" },
  { family: "Antro Vectra",        weight: 700, fmt: "opentype",  mime: "font/otf",   file: "AntroVectraBolder.otf" },
];

let css = "";
for (const f of faces) {
  const data = b64(f.file);
  css += `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:block;src:url(data:${f.mime};base64,${data}) format('${f.fmt}')}`;
}

const sizeLines = faces.map((f) => {
  const kb = (fs.statSync(path.join(FONTS_DIR, f.file)).size / 1024).toFixed(0);
  return ` *   ${f.family} w${f.weight}: ${kb} KB  (${f.file})`;
}).join("\n");

const output = `/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Base64-embedded brand fonts for the PDF engine.
 * Embedding guarantees Porter FT, Wix MadeFor Display, Kalissa, and Antro Vectra
 * render in server-side Chromium regardless of host system fonts.
 *
 * Regenerate: node scripts/gen-fonts.mjs
 * Font sources: artifacts/transyachtgroup/public/fonts/
 *
 * Embedded:
${sizeLines}
 */
export const FONT_FACE_CSS = ${JSON.stringify(css)};
`;

fs.writeFileSync(OUT, output, "utf8");
const totalKb = (Buffer.byteLength(output, "utf8") / 1024).toFixed(0);
console.log(`Written fonts.generated.ts — ${totalKb} KB`);
for (const f of faces) {
  const kb = (fs.statSync(path.join(FONTS_DIR, f.file)).size / 1024).toFixed(0);
  console.log(`  ${f.family} w${f.weight}: ${kb} KB`);
}
