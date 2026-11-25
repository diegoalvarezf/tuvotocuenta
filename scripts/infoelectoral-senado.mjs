// Convierte los ficheros oficiales del Ministerio del Interior (infoelectoral) de las elecciones al Senado
// a JSON por provincia y circunscripción (en Baleares y Canarias, por islas): votos de cada candidato y si salió elegido.
//
// Uso: node scripts/infoelectoral-senado.mjs <carpeta con los .DAT> <salida.json>
// Ficheros: https://infoelectoral.interior.gob.es/es/elecciones-celebradas/area-de-descargas/
// (Senado, "Totales": 03AAAAMM_TOTA.zip). Formato descrito en FICHEROS.doc del zip:
//   04: candidatos (provincia, distrito, orden del senador en la circunscripción, candidatura, nombre). Su marca de
//       «elegido» refleja relevos posteriores (en Teruel falta uno): se usa la del escrutinio, en el 08
//   07: datos por ámbito (censo, votantes, blanco, nulos, escaños)
//   08: votos y escaño de cada senador; el código es provincia + distrito + orden del senador del fichero 04

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, salida] = process.argv.slice(2);
if (!dir || !salida) {
  console.error('Uso: node scripts/infoelectoral-senado.mjs <carpeta> <salida.json>');
  process.exit(1);
}

// Los .DAT son de ancho fijo en ISO-8859-1: un byte = un carácter
const leer = (prefijo) => {
  const fichero = readdirSync(dir).find((f) => f.startsWith(prefijo) && f.endsWith('.DAT'));
  if (!fichero) throw new Error(`No encuentro ${prefijo}*.DAT en ${dir}`);
  return readFileSync(join(dir, fichero), 'latin1').split(/\r?\n/).filter(Boolean);
};
const num = (s) => Number.parseInt(s, 10);
const txt = (s) => s.replace(/\s+/g, ' ').trim();

// 03: candidaturas
const siglas = new Map();
for (const l of leer('03')) siglas.set(l.slice(8, 14), txt(l.slice(14, 64)));

// 07: una fila por circunscripción (distrito 9 = total provincial; en las islas, cada distrito es una isla)
const circs = new Map();
const totalProvincia = new Map();
for (const l of leer('07')) {
  const comunidad = l.slice(9, 11);
  const provincia = l.slice(11, 13);
  const distrito = l.slice(13, 14);
  if (comunidad === '99' || provincia === '99') continue;
  const datos = {
    nombre: txt(l.slice(14, 64)),
    censo: num(l.slice(85, 93)),
    blanco: num(l.slice(125, 133)),
    nulos: num(l.slice(133, 141)),
    aCandidaturas: num(l.slice(141, 149)),
    escanos: num(l.slice(149, 155)),
  };
  if (distrito === '9') totalProvincia.set(provincia, datos);
  else circs.set(provincia + distrito, { ...datos, candidatos: [] });
}
// Provincias sin islas: la circunscripción es la provincia entera
for (const [provincia, datos] of totalProvincia) {
  if (![...circs.keys()].some((k) => k.startsWith(provincia))) circs.set(provincia + '9', { ...datos, candidatos: [] });
}

// 04: titulares, con su candidatura y si salieron elegidos
const candidatos = new Map();
for (const l of leer('04')) {
  if (l[24] !== 'T') continue;
  const codigo = l.slice(9, 15);
  candidatos.set(codigo, {
    nombre: txt(`${l.slice(25, 50)} ${l.slice(50, 75)} ${l.slice(75, 100)}`),
    siglas: siglas.get(l.slice(15, 21)) ?? txt(l.slice(15, 21)),
  });
}

// 08: votos de cada senador en su circunscripción
for (const l of leer('08')) {
  const comunidad = l.slice(9, 11);
  const provincia = l.slice(11, 13);
  const distrito = l.slice(13, 14);
  if (comunidad === '99' || provincia === '99') continue;
  const circ = circs.get(provincia + distrito);
  if (!circ) continue; // filas de total provincial cuando la provincia vota por islas
  const c = candidatos.get(l.slice(14, 20));
  if (!c) throw new Error(`Votos sin candidato: ${l}`);
  circ.candidatos.push({ ...c, votos: num(l.slice(20, 28)), elegido: num(l.slice(28, 33)) > 0 });
}

const provincias = new Map();
for (const [clave, c] of circs) {
  const id = clave.slice(0, 2);
  const lista = c.candidatos.sort((a, b) => b.votos - a.votos);
  const elegidos = lista.filter((x) => x.elegido);
  if (elegidos.length !== c.escanos) throw new Error(`${c.nombre}: ${elegidos.length} elegidos de ${c.escanos}`);
  // Los elegidos son los más votados (art. 166.1.b de la ley electoral)
  if (lista.slice(0, c.escanos).some((x) => !x.elegido)) throw new Error(`${c.nombre}: un elegido no está entre los más votados`);
  const p = provincias.get(id) ?? { id, circunscripciones: [] };
  p.circunscripciones.push({
    isla: clave.endsWith('9') ? null : c.nombre,
    escanos: c.escanos,
    censo: c.censo,
    votantes: c.blanco + c.nulos + c.aCandidaturas,
    blanco: c.blanco,
    nulos: c.nulos,
    candidatos: lista,
  });
  provincias.set(id, p);
}

const resultado = [...provincias.values()].sort((a, b) => a.id.localeCompare(b.id));
const total = resultado.flatMap((p) => p.circunscripciones).reduce((s, c) => s + c.escanos, 0);
if (total !== 208) throw new Error(`Suman ${total} senadores elegidos, deberían ser 208`);

writeFileSync(salida, JSON.stringify({ fuente: 'Ministerio del Interior, Senado julio 2023 (03202307_TOTA)', provincias: resultado }, null, 2) + '\n');
console.log(`${resultado.length} provincias, ${resultado.flatMap((p) => p.circunscripciones).length} circunscripciones, ${total} senadores → ${salida}`);
