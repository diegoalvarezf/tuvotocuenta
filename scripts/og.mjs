// Genera las imágenes de vista previa para compartir (Open Graph, 1200×630) en public/og/:
//   general.png y una por provincia (<slug>.png) con los diputados que elige en 2026.
//
// Uso: node scripts/og.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import satori from 'satori';
import sharp from 'sharp';
import resultados from '../src/data/congreso-2023.json' with { type: 'json' };
import escanos2026 from '../src/data/escanos-2026.json' with { type: 'json' };

const fuente = (ruta) => readFileSync(`node_modules/${ruta}`);
const FUENTES = [
  { name: 'Serif', data: fuente('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Serif', data: fuente('@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff'), weight: 400, style: 'italic' },
  { name: 'Sans', data: fuente('@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Sans', data: fuente('@fontsource/instrument-sans/files/instrument-sans-latin-500-normal.woff'), weight: 500, style: 'normal' },
];
const PAPEL = '#f7f6f2';
const TINTA = '#161615';
const SUAVE = '#6d6c66';

// Mismos slugs que src/lib/provincias.ts
const SLUGS = { '01': 'alava', '03': 'alicante', '07': 'baleares', '12': 'castellon', '46': 'valencia' };
const slug = (id, nombre) =>
  SLUGS[id] ?? nombre.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

// Elemento al estilo React sin JSX
const h = (type, style, ...children) => ({ type, props: { style, children: children.length === 1 ? children[0] : children } });

function plantilla(linea1, linea2, pie) {
  return h(
    'div',
    { width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: PAPEL, padding: '72px 80px', fontFamily: 'Sans', color: TINTA },
    h('div', { display: 'flex', fontFamily: 'Serif', fontSize: 40 }, 'tu', h('span', { fontStyle: 'italic' }, 'voto'), 'cuenta'),
    h(
      'div',
      { display: 'flex', flexDirection: 'column', fontFamily: 'Serif', fontSize: 112, lineHeight: 1, letterSpacing: '-0.02em' },
      h('div', {}, linea1),
      h('div', { fontStyle: 'italic' }, linea2),
    ),
    h('div', { display: 'flex', justifyContent: 'space-between', fontSize: 28, color: SUAVE, borderTop: `2px solid ${TINTA}`, paddingTop: 24 }, h('span', {}, pie), h('span', {}, 'tuvotocuenta.es')),
  );
}

async function guardar(arbol, ruta) {
  const svg = await satori(arbol, { width: 1200, height: 630, fonts: FUENTES });
  if (process.env.DEBUG_OG) writeFileSync(ruta.replace('.png', '.svg'), svg);
  writeFileSync(ruta, await sharp(Buffer.from(svg)).png().toBuffer());
}

mkdirSync('public/og', { recursive: true });
await guardar(plantilla('Antes de votar,', 'compara.', 'Elecciones generales · 29 de noviembre'), 'public/og/general.png');

for (const p of resultados) {
  const e = escanos2026.find((x) => x.id === p.id);
  const palabra = e.escanos === 1 ? 'diputado' : 'diputados';
  await guardar(plantilla(p.nombre, `elige ${e.escanos} ${palabra}.`, 'Cómo cuenta tu voto el 29 de noviembre'), `public/og/${slug(p.id, p.nombre)}.png`);
}
console.log(`${resultados.length + 1} imágenes → public/og/`);
