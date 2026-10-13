// Extrae del anexo del Real Decreto de convocatoria los diputados que elige cada provincia
// y los asocia al código INE de provincia usando los nombres de congreso-2023.json.
//
// Uso: node scripts/boe-escanos.mjs <texto del RD en txt> <congreso-2023.json> <salida.json>
// Fuente 2026: Real Decreto 806/2026, BOE-A-2026-20742 (https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742)

import { readFileSync, writeFileSync } from 'node:fs';

const [txt, ref, salida] = process.argv.slice(2);
const NUMEROS = { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, 'dieciséis': 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, 'treinta y dos': 32, 'treinta y tres': 33, 'treinta y uno': 31, 'treinta y siete': 37, 'treinta y ocho': 38, 'treinta y nueve': 39 };
// "Coruña (A)" y "A Coruña", o "Alicante/Alacant" y "Alacant/Alicante", dan la misma clave
const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').split(/[^a-z]+/).filter(Boolean).sort().join(' ');

const lineas = readFileSync(txt, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const inicio = lineas.indexOf('Diputados') + 1;
const provincias = JSON.parse(readFileSync(ref, 'utf8'));

const resultado = [];
for (let i = inicio; i + 1 < lineas.length && lineas[i].endsWith('.'); i += 2) {
  const nombre = lineas[i].slice(0, -1);
  const escanos = NUMEROS[lineas[i + 1].slice(0, -1).toLowerCase()];
  if (!escanos) throw new Error(`Número no reconocido: ${lineas[i + 1]}`);
  const n = norm(nombre);
  const p = provincias.find((p) => norm(p.nombre) === n);
  if (!p) throw new Error(`Sin código INE para ${nombre}`);
  resultado.push({ id: p.id, nombre, escanos });
}

const total = resultado.reduce((s, p) => s + p.escanos, 0);
if (resultado.length !== 52 || total !== 350) throw new Error(`${resultado.length} provincias y ${total} escaños`);
if (new Set(resultado.map((p) => p.id)).size !== 52) throw new Error('Códigos INE duplicados');
writeFileSync(salida, JSON.stringify(resultado, null, 2) + '\n');
console.log(`${resultado.length} provincias, ${total} escaños → ${salida}`);
