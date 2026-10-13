// Convierte los ficheros oficiales del Ministerio del Interior (infoelectoral)
// de unas elecciones al Congreso a JSON por provincia.
//
// Uso: node scripts/infoelectoral-congreso.mjs <carpeta con los .DAT> <salida.json>
// Ficheros: https://infoelectoral.interior.gob.es/es/elecciones-celebradas/area-de-descargas/
// (Congreso, "Totales": 02AAAAMM_TOTA.zip). Formato descrito en FICHEROS.doc del zip.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, salida] = process.argv.slice(2);
if (!dir || !salida) {
  console.error('Uso: node scripts/infoelectoral-congreso.mjs <carpeta> <salida.json>');
  process.exit(1);
}

// Los .DAT son de ancho fijo en ISO-8859-1: un byte = un carácter
const leer = (prefijo) => {
  const fichero = readdirSync(dir).find((f) => f.startsWith(prefijo) && f.endsWith('.DAT'));
  if (!fichero) throw new Error(`No encuentro ${prefijo}*.DAT en ${dir}`);
  return readFileSync(join(dir, fichero), 'latin1').split(/\r?\n/).filter(Boolean);
};
const num = (s) => Number.parseInt(s, 10);
const txt = (s) => s.trim();

// 03: candidaturas
const candidaturas = new Map();
for (const l of leer('03')) {
  candidaturas.set(l.slice(8, 14), {
    siglas: txt(l.slice(14, 64)),
    nombre: txt(l.slice(64, 214)),
    nacional: l.slice(226, 232),
  });
}

// 07: totales por ámbito superior al municipio (provincia 99 = total autonómico, comunidad 99 = total nacional)
const provincias = new Map();
for (const l of leer('07')) {
  const comunidad = l.slice(9, 11);
  const provincia = l.slice(11, 13);
  if (comunidad === '99' || provincia === '99') continue;
  const r = l.slice(64);
  const blanco = num(r.slice(61, 69));
  const nulos = num(r.slice(69, 77));
  const aCandidaturas = num(r.slice(77, 85));
  provincias.set(provincia, {
    id: provincia,
    nombre: txt(l.slice(14, 64)),
    escanos: num(r.slice(85, 91)),
    censo: num(r.slice(21, 29)),
    votantes: blanco + nulos + aCandidaturas,
    blanco,
    nulos,
    votosValidos: blanco + aCandidaturas,
    candidaturas: [],
  });
}

// 08: votos y escaños de cada candidatura por provincia
for (const l of leer('08')) {
  const comunidad = l.slice(9, 11);
  const provincia = l.slice(11, 13);
  if (comunidad === '99' || provincia === '99') continue;
  const p = provincias.get(provincia);
  const c = candidaturas.get(l.slice(14, 20));
  if (!p || !c) throw new Error(`Registro sin provincia o candidatura: ${l}`);
  p.candidaturas.push({
    siglas: c.siglas,
    nombre: c.nombre,
    grupo: c.nacional,
    votos: num(l.slice(20, 28)),
    escanos: num(l.slice(28, 33)),
  });
}

const resultado = [...provincias.values()]
  .map((p) => ({ ...p, candidaturas: p.candidaturas.sort((a, b) => b.votos - a.votos) }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

const totalEscanos = resultado.reduce((s, p) => s + p.escanos, 0);
if (totalEscanos !== 350) throw new Error(`Suman ${totalEscanos} escaños, deberían ser 350`);
for (const p of resultado) {
  const suma = p.candidaturas.reduce((s, c) => s + c.escanos, 0);
  if (suma !== p.escanos) throw new Error(`${p.nombre}: candidaturas suman ${suma} escaños de ${p.escanos}`);
}

writeFileSync(salida, JSON.stringify(resultado, null, 2) + '\n');
console.log(`${resultado.length} provincias, ${totalEscanos} escaños → ${salida}`);
