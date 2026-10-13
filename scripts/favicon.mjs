// Genera el icono de la web: la «v» en cursiva de tu·voto·cuenta sobre fondo tinta.
//   public/favicon.svg, public/favicon.ico (32 px) y public/apple-touch-icon.png (180 px)
//
// Uso: node scripts/favicon.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import satori from 'satori';
import sharp from 'sharp';

const serif = readFileSync('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff');
const TINTA = '#161615';
const PAPEL = '#f7f6f2';

const arbol = {
  type: 'div',
  props: {
    style: { width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: TINTA, borderRadius: 14 },
    children: { type: 'span', props: { style: { fontFamily: 'Serif', fontStyle: 'italic', fontSize: 58, color: PAPEL, marginTop: -10 }, children: 'v' } },
  },
};
const svg = await satori(arbol, { width: 64, height: 64, fonts: [{ name: 'Serif', data: serif, weight: 400, style: 'italic' }] });
writeFileSync('public/favicon.svg', svg);

const png = (tam) => sharp(Buffer.from(svg)).resize(tam, tam).png().toBuffer();
writeFileSync('public/apple-touch-icon.png', await png(180));

// ICO con una imagen PNG de 32 px dentro (formato admitido por todos los navegadores actuales)
const datos = await png(32);
const cabecera = Buffer.alloc(22);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(1, 4);
cabecera.writeUInt8(32, 6);
cabecera.writeUInt8(32, 7);
cabecera.writeUInt16LE(1, 10);
cabecera.writeUInt16LE(32, 12);
cabecera.writeUInt32LE(datos.length, 14);
cabecera.writeUInt32LE(22, 18);
writeFileSync('public/favicon.ico', Buffer.concat([cabecera, datos]));
console.log('favicon.svg, favicon.ico y apple-touch-icon.png → public/');
