// Prepara src/data/congreso-2026.json a partir de resultados por provincia ya convertidos al formato de
// congreso-2023.json (por ejemplo con infoelectoral-congreso.mjs, o con un adaptador del avance de la noche electoral).
// Comprueba que los escaños de cada provincia coinciden con los del Real Decreto de convocatoria y suman 350.
//
// Uso: node scripts/resultados-2026.mjs <provincias.json> <escrutado %> <provisional|definitivo> <url de la fuente> "<nombre de la fuente>"

import { readFileSync, writeFileSync } from 'node:fs';
import escanos2026 from '../src/data/escanos-2026.json' with { type: 'json' };

const [entrada, escrutado, estado, url, nombre] = process.argv.slice(2);
if (!entrada || !escrutado || !['provisional', 'definitivo'].includes(estado) || !url || !nombre) {
  console.error('Uso: node scripts/resultados-2026.mjs <provincias.json> <escrutado %> <provisional|definitivo> <url> "<nombre fuente>"');
  process.exit(1);
}

const provincias = JSON.parse(readFileSync(entrada, 'utf8'));
for (const e of escanos2026) {
  const p = provincias.find((x) => x.id === e.id);
  if (!p) throw new Error(`Falta la provincia ${e.nombre}`);
  if (p.escanos !== e.escanos) throw new Error(`${e.nombre}: ${p.escanos} escaños y el Real Decreto dice ${e.escanos}`);
  const suma = p.candidaturas.reduce((s, c) => s + c.escanos, 0);
  if (suma !== p.escanos) throw new Error(`${e.nombre}: las candidaturas suman ${suma} escaños de ${p.escanos}`);
}

const salida = {
  escrutado: Number(escrutado),
  provisional: estado === 'provisional',
  actualizado: new Date().toISOString(),
  fuente: { nombre, url },
  provincias,
};
writeFileSync('src/data/congreso-2026.json', JSON.stringify(salida, null, 2) + '\n');
console.log(`${provincias.length} provincias, escrutado ${escrutado} % (${estado}) → src/data/congreso-2026.json`);
