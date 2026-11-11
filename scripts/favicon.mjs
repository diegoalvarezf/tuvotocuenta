// Genera el icono de la web: un sobre de votación abierto con la papeleta asomando, sobre fondo tinta.
//   public/favicon.svg, public/favicon.ico (32 px) y public/apple-touch-icon.png (180 px)
//
// Uso: node scripts/favicon.mjs

import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const TINTA = '#161615';
const PAPEL = '#f7f6f2';

// Solapa abierta detrás (papel atenuado), papeleta con dos líneas de texto y bolsillo del sobre delante con sus pliegues en V
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="${TINTA}"/>
<path d="M11 30 L32 15 L53 30 Z" fill="${PAPEL}" opacity=".55"/>
<rect x="19" y="11" width="26" height="28" rx="2" fill="${PAPEL}"/>
<rect x="23" y="16" width="14" height="2.6" rx="1.3" fill="${TINTA}"/>
<rect x="23" y="21" width="18" height="2.6" rx="1.3" fill="${TINTA}"/>
<path d="M11 30 H53 V49 a3 3 0 0 1 -3 3 H14 a3 3 0 0 1 -3 -3 Z" fill="${PAPEL}"/>
<path d="M11 30 L32 43 L53 30" fill="none" stroke="${TINTA}" stroke-width="2.6" stroke-linejoin="round"/>
</svg>
`;
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
