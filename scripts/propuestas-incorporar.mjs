// Comprueba un borrador de propuestas contra el texto del PDF y añade a src/data/propuestas.json las que pasan, sin revisar.
// Una cita que no aparece literalmente en su página se descarta y se lista. Sustituye lo que hubiera de ese partido sin revisar.
//
// Uso: node scripts/propuestas-incorporar.mjs <paginas.json> <partido> <borrador.json>
// El borrador es una lista de { tema, resumen, cita, pagina, concreta }.

import { readFileSync, writeFileSync } from 'node:fs';
import TEMAS from '../src/data/temas.json' with { type: 'json' };
import programas from '../src/data/programas.json' with { type: 'json' };
import { crearVerificador } from './lib/citas.mjs';

const [entrada, partido, borrador] = process.argv.slice(2);
if (!entrada || !partido || !borrador) {
  console.error('Uso: node scripts/propuestas-incorporar.mjs <paginas.json> <partido> <borrador.json>');
  process.exit(1);
}
if (!programas.some((p) => p.siglas === partido)) throw new Error(`Partido desconocido: ${partido}`);

const { paginas } = JSON.parse(readFileSync(entrada, 'utf8'));
const verificar = crearVerificador(paginas);
const validas = [];
const descartadas = [];
for (const p of JSON.parse(readFileSync(borrador, 'utf8'))) {
  if (TEMAS.includes(p.tema) && verificar(p)) validas.push({ partido, ...p, revisada: false });
  else descartadas.push(p);
}

const ruta = 'src/data/propuestas.json';
const resto = JSON.parse(readFileSync(ruta, 'utf8')).filter((p) => p.partido !== partido || p.revisada);
writeFileSync(ruta, JSON.stringify([...resto, ...validas], null, 2) + '\n');
console.log(`${partido}: ${validas.length} verificadas, ${descartadas.length} descartadas`);
for (const d of descartadas) console.log(`  descartada (pág. ${d.pagina}): ${d.cita.slice(0, 90)}`);
