// Descarga todas las votaciones del Pleno de una legislatura desde los datos abiertos del Congreso
// y genera un índice con título, fecha, resultado y voto agregado por grupo parlamentario.
//
// Uso: node scripts/congreso-votaciones.mjs <carpeta caché> [legislatura romana, por defecto XV]
// Fuente: https://www.congreso.es/es/opendata/votaciones

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [cache, legislatura = 'XV'] = process.argv.slice(2);
if (!cache) {
  console.error('Uso: node scripts/congreso-votaciones.mjs <carpeta caché> [legislatura]');
  process.exit(1);
}
mkdirSync(join(cache, 'zip'), { recursive: true });
mkdirSync(join(cache, 'json'), { recursive: true });

const BASE = 'https://www.congreso.es';
const PAGINA = `${BASE}/es/opendata/votaciones?p_p_id=votaciones&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&targetLegislatura=${legislatura}`;
// La web rechaza peticiones sin User-Agent de navegador
const CABECERAS = { 'User-Agent': 'Mozilla/5.0 (tuvotocuenta; datos abiertos)' };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function texto(url) {
  for (let intento = 1; ; intento++) {
    const res = await fetch(url, { headers: CABECERAS });
    if (res.ok) return res.text();
    if (intento === 3) throw new Error(`${res.status} en ${url}`);
    await espera(3000 * intento);
  }
}

async function binario(url, destino) {
  const res = await fetch(url, { headers: CABECERAS });
  if (!res.ok) throw new Error(`${res.status} en ${url}`);
  writeFileSync(destino, Buffer.from(await res.arrayBuffer()));
}

const portada = await texto(PAGINA);
const dias = JSON.parse(portada.match(/var diasVotaciones = (\[[^\]]*\])/)[1]).map(String).sort();
console.log(`${dias.length} días con votaciones`);

for (const dia of dias) {
  const carpeta = join(cache, 'json', dia);
  if (existsSync(carpeta)) continue;
  const fecha = `${dia.slice(6, 8)}/${dia.slice(4, 6)}/${dia.slice(0, 4)}`;
  const html = await texto(`${PAGINA}&targetDate=${fecha}`);
  const zips = [...new Set(html.match(/\/webpublica\/opendata\/votaciones\/[^"]+\.zip/g) ?? [])];
  const sueltos = [...new Set(html.match(/\/webpublica\/opendata\/votaciones\/[^"]+\/Votacion\d+\/[^"]+\.json/g) ?? [])];
  mkdirSync(carpeta, { recursive: true });
  let enZip = 0;
  for (const z of zips) {
    const destino = join(cache, 'zip', z.split('/').pop());
    await binario(BASE + z, destino);
    const contenido = execFileSync('unzip', ['-Z1', destino], { encoding: 'utf8' });
    if (!/\.json$/m.test(contenido)) continue;
    execFileSync('unzip', ['-o', '-q', destino, '*.json', '-d', carpeta]);
    enZip++;
  }
  // Algunos zips antiguos solo traen imágenes: entonces se baja el JSON de cada votación
  if (enZip === 0) {
    for (const s of sueltos) {
      const [, votacion, nombre] = s.match(/\/(Votacion\d+)\/([^/]+)$/);
      mkdirSync(join(carpeta, votacion), { recursive: true });
      await binario(BASE + s, join(carpeta, votacion, nombre));
      await espera(200);
    }
  }
  console.log(`${dia}: ${enZip ? `${enZip} zip` : `${sueltos.length} json sueltos`}`);
  await espera(1000);
}

// Índice: una entrada por votación con el sentido de voto de cada grupo
const indice = [];
for (const dia of readdirSync(join(cache, 'json')).sort()) {
  const archivos = execFileSync('find', [join(cache, 'json', dia), '-name', '*.json'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .sort();
  for (const archivo of archivos) {
    const v = JSON.parse(readFileSync(archivo, 'utf8'));
    const grupos = {};
    for (const d of v.votaciones ?? []) {
      grupos[d.grupo] ??= { Sí: 0, No: 0, Abstención: 0, 'No vota': 0 };
      grupos[d.grupo][d.voto] = (grupos[d.grupo][d.voto] ?? 0) + 1;
    }
    indice.push({
      dia,
      sesion: v.informacion.sesion,
      numero: v.informacion.numeroVotacion,
      titulo: v.informacion.titulo,
      expediente: v.informacion.textoExpediente?.trim(),
      subgrupo: v.informacion.textoSubGrupo?.trim() || undefined,
      totales: v.totales,
      grupos,
      archivo: archivo.slice(join(cache, 'json').length + 1),
    });
  }
}
writeFileSync(join(cache, 'indice.json'), JSON.stringify(indice, null, 1));
console.log(`${indice.length} votaciones → ${join(cache, 'indice.json')}`);
