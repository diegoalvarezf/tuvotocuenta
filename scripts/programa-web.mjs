// Guarda el texto de un programa publicado solo como página web, para verificar sus citas.
// Se lee la copia de archive.org (la que se enlaza), sin la barra del archivo (sufijo id_), para que el texto
// sea el mismo que verá quien abra el enlace. Todo el texto va como «página 1».
//
// Uso: node scripts/programa-web.mjs <url de web.archive.org/web/AAAAMMDDhhmmss/...> <salida.json> [selector]
// El selector opcional es un id de HTML (#compromisos) para quedarse solo con esa sección.

import { writeFileSync } from 'node:fs';

const [copia, salida, seccion] = process.argv.slice(2);
if (!copia || !salida || !/web\.archive\.org\/web\/\d{14}\//.test(copia)) {
  console.error('Uso: node scripts/programa-web.mjs <url de web.archive.org/web/AAAAMMDDhhmmss/...> <salida.json> [#id]');
  process.exit(1);
}

const cruda = copia.replace(/\/web\/(\d{14})\//, '/web/$1id_/');
const r = await fetch(cruda, { headers: { 'User-Agent': 'Mozilla/5.0 (tuvotocuenta; datos abiertos)' } });
if (!r.ok) throw new Error(`${r.status} al leer ${cruda}`);
let html = await r.text();

if (seccion) {
  const id = seccion.replace(/^#/, '');
  const i = html.search(new RegExp(`id=["']${id}["']`));
  if (i < 0) throw new Error(`No está la sección ${seccion}`);
  // Desde la sección hasta la siguiente sección del mismo nivel
  const resto = html.slice(i);
  const fin = resto.slice(1).search(/<section[\s>]/);
  html = fin > 0 ? resto.slice(0, fin + 1) : resto;
}

const entidades = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', ndash: '–', mdash: '—', hellip: '…', euro: '€', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const texto = html
  .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/?(p|div|li|ul|ol|h[1-6]|section|article|header|footer|tr|td|th|blockquote|nav|main)[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (entidades[e.toLowerCase()] ?? m))
  .split('\n')
  .map((l) => l.replace(/[ \t]+/g, ' ').trim())
  .filter(Boolean)
  .join('\n');

writeFileSync(salida, JSON.stringify({ total: 1, web: true, copia, paginas: [{ pagina: 1, texto }] }, null, 1));
console.log(`${texto.split(/\s+/).length} palabras → ${salida}`);
