// Genera src/data/decretos.json con todos los decretos ley votados en el Pleno durante la legislatura:
// la votación (datos abiertos del Congreso) y el RESULTADO OFICIAL, tomado de la resolución del Congreso publicada
// en el BOE («Acuerdo de convalidación» o «Acuerdo de derogación»). El resultado no se deduce de los recuentos,
// porque en algún caso los datos abiertos no recogen la votación definitiva (p. ej., empates que se repitieron).
//
// Uso: node scripts/decretos.mjs <carpeta caché de congreso-votaciones.mjs>

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [cache] = process.argv.slice(2);
if (!cache) {
  console.error('Uso: node scripts/decretos.mjs <carpeta caché>');
  process.exit(1);
}
mkdirSync(join(cache, 'boe'), { recursive: true });

const CABECERAS = { 'User-Agent': 'Mozilla/5.0 (tuvotocuenta; datos abiertos)' };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const GRUPOS = ['GS', 'GP', 'GVOX', 'GSUMAR', 'GR', 'GJxCAT', 'GEH Bildu', 'GV (EAJ-PNV)', 'GMx'];

// Sumario del BOE de un día (con caché en disco)
async function sumario(fecha) {
  const ruta = join(cache, 'boe', `${fecha}.html`);
  if (existsSync(ruta)) return readFileSync(ruta, 'utf8');
  const [a, m, d] = fecha.split('-');
  const res = await fetch(`https://www.boe.es/boe/dias/${a}/${m}/${d}/`, { headers: CABECERAS });
  const html = res.ok ? await res.text() : '';
  writeFileSync(ruta, html);
  await espera(300);
  return html;
}

const masDias = (fecha, n) => {
  const f = new Date(fecha + 'T12:00:00Z');
  f.setUTCDate(f.getUTCDate() + n);
  return f.toISOString().slice(0, 10);
};

function postura(g = {}) {
  const o = [['si', g['Sí'] ?? 0], ['no', g['No'] ?? 0], ['abstencion', g['Abstención'] ?? 0]];
  const max = Math.max(...o.map(([, n]) => n));
  if (max === 0) return 'noVota';
  const w = o.filter(([, n]) => n === max);
  return w.length === 1 ? w[0][0] : 'dividido';
}

const indice = JSON.parse(readFileSync(join(cache, 'indice.json'), 'utf8'));
const votos = indice.filter((v) => v.titulo.startsWith('Convalidación') && /^Real Decreto-ley/.test(v.expediente ?? ''));

const salida = [];
for (const v of votos) {
  const [, numero, anio] = v.expediente.match(/^Real Decreto-ley (\d+)\/(\d{4})/);
  const nombre = `Real Decreto-ley ${numero}/${anio}`;
  const dia = `${v.dia.slice(0, 4)}-${v.dia.slice(4, 6)}-${v.dia.slice(6, 8)}`;
  const patron = new RegExp(`Acuerdo de (convalidaci[oó]n|derogaci[oó]n) del Real Decreto-ley ${numero}/${anio}[,\\s]`, 'i');

  // La resolución se publica en el BOE en los días siguientes a la votación
  let resultado = null;
  let boe = null;
  for (let i = 0; i <= 12 && !resultado; i++) {
    const html = await sumario(masDias(dia, i));
    const m = html.match(patron);
    if (!m) continue;
    resultado = /convalid/i.test(m[1]) ? 'convalidado' : 'derogado';
    const tras = html.slice(m.index, m.index + 3000).match(/BOE-A-\d{4}-\d+/);
    boe = tras ? `https://www.boe.es/diario_boe/txt.php?id=${tras[0]}` : null;
  }
  if (!resultado || !boe) throw new Error(`Sin resolución en el BOE para ${nombre} (votado el ${dia})`);

  salida.push({
    nombre,
    titulo: v.expediente.replace(/^Real Decreto-ley \d+\/\d{4}, de [^,]+, /, '').replace(/\.$/, ''),
    votacion: dia,
    resultado,
    boe,
    totales: { si: v.totales.afavor, no: v.totales.enContra, abstencion: v.totales.abstenciones },
    grupos: Object.fromEntries(GRUPOS.map((c) => [c, postura(v.grupos[c])])),
  });
  console.log(`${dia} ${nombre}: ${resultado}`);
}

writeFileSync('src/data/decretos.json', JSON.stringify(salida, null, 2) + '\n');
const derogados = salida.filter((d) => d.resultado === 'derogado').length;
console.log(`${salida.length} decretos: ${salida.length - derogados} convalidados, ${derogados} derogados → src/data/decretos.json`);
