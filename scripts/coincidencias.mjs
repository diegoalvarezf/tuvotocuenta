// Calcula, para cada par de grupos parlamentarios, en qué porcentaje de votaciones del Pleno votaron lo mismo.
//
// Método:
// - Postura de un grupo en una votación = lo que votó la mayoría de sus diputados (sí, no o abstención).
//   Si hay empate entre opciones, el grupo no tiene postura clara y esa votación no cuenta para él.
//   Los diputados que no votan no cuentan.
// - Coincidencia entre A y B = votaciones en las que ambos tienen postura y es la misma / votaciones en las que ambos tienen postura.
// - El Grupo Mixto no se incluye: reúne a diputados de formaciones distintas y su «postura» no representa a ninguna.
//
// Uso: node scripts/coincidencias.mjs <carpeta caché de congreso-votaciones.mjs>

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [cache] = process.argv.slice(2);
if (!cache) {
  console.error('Uso: node scripts/coincidencias.mjs <carpeta caché>');
  process.exit(1);
}

const GRUPOS = {
  GS: 'Socialista',
  GP: 'Popular',
  GVOX: 'Vox',
  GSUMAR: 'Sumar',
  GR: 'Republicano (ERC)',
  GJxCAT: 'Junts',
  'GEH Bildu': 'EH Bildu',
  'GV (EAJ-PNV)': 'Vasco (PNV)',
};
const indice = JSON.parse(readFileSync(join(cache, 'indice.json'), 'utf8'));

function postura(g) {
  if (!g) return null;
  const opciones = [['si', g['Sí'] ?? 0], ['no', g['No'] ?? 0], ['abstencion', g['Abstención'] ?? 0]];
  const max = Math.max(...opciones.map(([, n]) => n));
  if (max === 0) return null;
  const ganadoras = opciones.filter(([, n]) => n === max);
  return ganadoras.length === 1 ? ganadoras[0][0] : null;
}

const codigos = Object.keys(GRUPOS);
const posturas = indice.map((v) => Object.fromEntries(codigos.map((c) => [c, postura(v.grupos[c])])));

const resultado = codigos.map((a) => ({
  codigo: a,
  nombre: GRUPOS[a],
  con: codigos
    .filter((b) => b !== a)
    .map((b) => {
      let comunes = 0;
      let iguales = 0;
      for (const p of posturas) {
        if (!p[a] || !p[b]) continue;
        comunes++;
        if (p[a] === p[b]) iguales++;
      }
      return { codigo: b, nombre: GRUPOS[b], votaciones: comunes, iguales, porcentaje: Math.round((iguales / comunes) * 1000) / 10 };
    })
    .sort((x, y) => y.porcentaje - x.porcentaje),
}));

const salida = {
  total: indice.length,
  desde: indice.map((v) => v.dia).sort()[0],
  hasta: indice.map((v) => v.dia).sort().at(-1),
  grupos: resultado,
};
writeFileSync('src/data/coincidencias.json', JSON.stringify(salida, null, 2) + '\n');
console.log(`${indice.length} votaciones → src/data/coincidencias.json`);
for (const g of resultado) console.log(g.nombre.padEnd(18), g.con.map((c) => `${c.nombre.split(' ')[0]} ${c.porcentaje}%`).join(' · '));
