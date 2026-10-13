// Genera los ficheros descargables con TODAS las votaciones del Pleno de la legislatura
// a partir del índice de congreso-votaciones.mjs:
//   public/descargas/votaciones-xv-legislatura.csv
//   public/descargas/votaciones-xv-legislatura.pdf
//
// Uso: node scripts/votaciones-descarga.mjs <carpeta caché>

import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';

const [cache] = process.argv.slice(2);
if (!cache) {
  console.error('Uso: node scripts/votaciones-descarga.mjs <carpeta caché>');
  process.exit(1);
}

const GRUPOS = [
  ['GS', 'Socialista'],
  ['GP', 'Popular'],
  ['GVOX', 'Vox'],
  ['GSUMAR', 'Sumar'],
  ['GR', 'ERC'],
  ['GJxCAT', 'Junts'],
  ['GEH Bildu', 'EH Bildu'],
  ['GV (EAJ-PNV)', 'PNV'],
  ['GMx', 'Mixto'],
];
const FUENTE = 'https://www.congreso.es/es/opendata/votaciones';
const indice = JSON.parse(readFileSync(join(cache, 'indice.json'), 'utf8')).sort(
  (a, b) => a.dia.localeCompare(b.dia) || a.sesion - b.sesion || a.numero - b.numero,
);
const fecha = (d) => `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
const limpio = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const resumenGrupo = (g = {}) => {
  const partes = [['Sí', 'sí'], ['No', 'no'], ['Abstención', 'abst.'], ['No vota', 'no vota']]
    .filter(([k]) => g[k])
    .map(([k, e]) => `${g[k]} ${e}`);
  return partes.join(', ') || '–';
};

// Las votaciones de conjunto de leyes orgánicas necesitan mayoría absoluta: 176 síes (art. 81 de la Constitución)
function resultado(v) {
  const t = v.totales;
  const organica = /conjunto/i.test(`${v.expediente} ${v.subgrupo ?? ''}`) && /Ley Org[aá]nica/i.test(v.expediente ?? '');
  if (organica && t.afavor > t.enContra && t.afavor < 176) return 'Más síes que noes, pero sin la mayoría absoluta de 176 que exige una ley orgánica';
  if (t.afavor > t.enContra) return 'Ganó el sí';
  if (t.afavor < t.enContra) return 'Ganó el no';
  return 'Empate';
}

mkdirSync('public/descargas', { recursive: true });

// CSV: una fila por votación, con el desglose de cada grupo
const cabecera = ['fecha', 'sesion', 'votacion', 'tipo', 'expediente', 'apartado', 'resultado', 'si', 'no', 'abstencion', 'no_vota'];
for (const [, nombre] of GRUPOS) cabecera.push(`${nombre} si`, `${nombre} no`, `${nombre} abstencion`, `${nombre} no vota`);
const csv = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
const filas = [cabecera.map(csv).join(',')];
for (const v of indice) {
  const fila = [fecha(v.dia), v.sesion, v.numero, limpio(v.titulo), limpio(v.expediente), limpio(v.subgrupo), resultado(v), v.totales.afavor, v.totales.enContra, v.totales.abstenciones, v.totales.noVotan];
  for (const [codigo] of GRUPOS) {
    const g = v.grupos[codigo] ?? {};
    fila.push(g['Sí'] ?? 0, g['No'] ?? 0, g['Abstención'] ?? 0, g['No vota'] ?? 0);
  }
  filas.push(fila.map(csv).join(','));
}
// BOM para que Excel abra bien los acentos
writeFileSync('public/descargas/votaciones-xv-legislatura.csv', '﻿' + filas.join('\r\n') + '\r\n');

// PDF
const doc = new PDFDocument({ size: 'A4', margins: { top: 48, bottom: 48, left: 48, right: 48 }, bufferPages: true });
doc.pipe(createWriteStream('public/descargas/votaciones-xv-legislatura.pdf'));
doc.info.Title = 'Votaciones del Pleno del Congreso, XV legislatura';
doc.info.Author = 'tuvotocuenta';

const ancho = doc.page.width - 96;
doc.font('Times-Roman').fontSize(26).text('Votaciones del Pleno del Congreso');
doc.fontSize(16).text('XV legislatura (2023-2026)');
doc.moveDown();
doc.font('Helvetica').fontSize(10).fillColor('#333').text(
  `${indice.length} votaciones, del ${fecha(indice[0].dia)} al ${fecha(indice.at(-1).dia)}. ` +
    'Para cada una: tipo de votación, asunto, resultado y voto de cada grupo parlamentario (número de diputados).',
);
doc.moveDown(0.5);
doc.text(`Fuente: Congreso de los Diputados, datos abiertos de votaciones (${FUENTE}). Generado por tuvotocuenta sin modificar los datos.`);
doc.moveDown(0.5);
doc.text('Fecha de generación: ' + new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) + '.');
doc.addPage();

let diaActual = '';
for (const v of indice) {
  if (v.dia !== diaActual) {
    diaActual = v.dia;
    if (doc.y > doc.page.height - 120) doc.addPage();
    doc.moveDown(0.6).font('Times-Bold').fontSize(13).fillColor('#000').text(fecha(v.dia));
    doc.moveTo(48, doc.y + 2).lineTo(48 + ancho, doc.y + 2).lineWidth(0.5).stroke('#000');
    doc.moveDown(0.4);
  }
  if (doc.y > doc.page.height - 110) doc.addPage();
  const t = v.totales;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000').text(`Sesión ${v.sesion}, votación ${v.numero} · ${limpio(v.titulo)}`);
  doc.font('Helvetica').fontSize(8.5).text(limpio(v.expediente) + (v.subgrupo ? ` ${limpio(v.subgrupo)}` : ''));
  const gana = resultado(v);
  doc.text(`${gana}: ${t.afavor} sí, ${t.enContra} no, ${t.abstenciones} abstenciones, ${t.noVotan} no votan.`);
  doc.fillColor('#444').fontSize(7.5).text(GRUPOS.map(([c, n]) => `${n}: ${resumenGrupo(v.grupos[c])}`).join('  ·  '));
  doc.moveDown(0.5);
}

// Pie con número de página
const paginas = doc.bufferedPageRange();
for (let i = 0; i < paginas.count; i++) {
  doc.switchToPage(i);
  // Sin margen inferior para que el pie no cree una página nueva
  doc.page.margins.bottom = 0;
  doc.font('Helvetica').fontSize(7).fillColor('#777').text(`tuvotocuenta · Fuente: ${FUENTE} · ${i + 1}/${paginas.count}`, 48, doc.page.height - 32, {
    width: ancho,
    align: 'center',
    lineBreak: false,
  });
}
doc.end();
console.log(`${indice.length} votaciones → public/descargas/votaciones-xv-legislatura.{csv,pdf}`);
