// Genera src/data/votaciones.json con las votaciones elegidas en src/data/votaciones-seleccion.json:
// datos oficiales de cada votación, voto agregado por grupo, voto individual del Grupo Mixto
// y enlaces al acta oficial (PDF y JSON) en la web del Congreso.
//
// Uso: node scripts/votaciones-destacadas.mjs <carpeta caché de congreso-votaciones.mjs>

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [cache] = process.argv.slice(2);
if (!cache) {
  console.error('Uso: node scripts/votaciones-destacadas.mjs <carpeta caché>');
  process.exit(1);
}

const BASE = 'https://www.congreso.es';
const CABECERAS = { 'User-Agent': 'Mozilla/5.0 (tuvotocuenta; datos abiertos)' };
const GRUPOS = {
  GS: 'Socialista',
  GP: 'Popular',
  GVOX: 'Vox',
  GSUMAR: 'Sumar',
  GR: 'Republicano (ERC)',
  GJxCAT: 'Junts',
  'GEH Bildu': 'EH Bildu',
  'GV (EAJ-PNV)': 'Vasco (PNV)',
  GMx: 'Mixto',
};
const VOTOS = { Sí: 'si', No: 'no', Abstención: 'abstencion', 'No vota': 'noVota' };

const seleccion = JSON.parse(readFileSync('src/data/votaciones-seleccion.json', 'utf8'));
const paginas = new Map();

async function enlaces(dia, sesion, numero) {
  if (!paginas.has(dia)) {
    const fecha = `${dia.slice(6, 8)}/${dia.slice(4, 6)}/${dia.slice(0, 4)}`;
    const url = `${BASE}/es/opendata/votaciones?p_p_id=votaciones&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&targetLegislatura=XV&targetDate=${fecha}`;
    const res = await fetch(url, { headers: CABECERAS });
    if (!res.ok) throw new Error(`${res.status} en ${url}`);
    paginas.set(dia, await res.text());
  }
  const ruta = `/Sesion${String(sesion).padStart(3, '0')}/${dia}/Votacion${String(numero).padStart(3, '0')}/`;
  const buscar = (ext) => paginas.get(dia).match(new RegExp(`/webpublica/opendata/votaciones/Leg15${ruta}[^"]+\\.${ext}`))?.[0];
  const pdf = buscar('pdf');
  const json = buscar('json');
  if (!pdf || !json) throw new Error(`Sin enlaces oficiales para ${dia} sesión ${sesion} votación ${numero}`);
  return { pdf: BASE + pdf, json: BASE + json };
}

const salida = [];
for (const s of seleccion) {
  const v = JSON.parse(readFileSync(join(cache, 'json', s.archivo), 'utf8'));
  const { informacion: info, totales, votaciones } = v;
  const dia = s.archivo.slice(0, 8);

  const grupos = Object.entries(GRUPOS).map(([codigo, nombre]) => {
    const cuenta = { si: 0, no: 0, abstencion: 0, noVota: 0 };
    for (const d of votaciones.filter((d) => d.grupo === codigo)) cuenta[VOTOS[d.voto]]++;
    const votan = { si: cuenta.si, no: cuenta.no, abstencion: cuenta.abstencion };
    const max = Math.max(...Object.values(votan));
    const empatados = Object.keys(votan).filter((k) => votan[k] === max);
    // Sentido del grupo: lo que votó la mayoría de sus diputados; "dividido" si hubo empate
    const sentido = max === 0 ? 'noVota' : empatados.length > 1 ? 'dividido' : empatados[0];
    return { codigo, nombre, ...cuenta, sentido };
  });
  const sinGrupo = votaciones.filter((d) => !GRUPOS[d.grupo]);
  if (sinGrupo.length) throw new Error(`${s.archivo}: diputados con grupo desconocido ${sinGrupo.map((d) => d.grupo)}`);

  const comprobar = (campo, total) => {
    const suma = grupos.reduce((a, g) => a + g[campo], 0);
    if (suma !== total) throw new Error(`${s.archivo}: ${campo} suma ${suma} y el total oficial es ${total}`);
  };
  comprobar('si', totales.afavor);
  comprobar('no', totales.enContra);
  comprobar('abstencion', totales.abstenciones);

  salida.push({
    id: s.archivo.replace(/\.json$/, '').replace('/', '-'),
    fecha: `${dia.slice(0, 4)}-${dia.slice(4, 6)}-${dia.slice(6, 8)}`,
    tema: s.tema,
    nombre: s.nombre,
    resumen: s.resumen,
    siSignifica: s.siSignifica,
    nota: s.nota,
    notaFuente: s.notaFuente,
    oficial: {
      tipo: info.titulo.trim(),
      expediente: info.textoExpediente.trim(),
      subgrupo: info.textoSubGrupo?.trim() || undefined,
      sesion: info.sesion,
      numero: info.numeroVotacion,
    },
    totales: { si: totales.afavor, no: totales.enContra, abstencion: totales.abstenciones, noVota: totales.noVotan },
    gana: totales.afavor > totales.enContra ? 'si' : 'no',
    grupos,
    mixto: votaciones
      .filter((d) => d.grupo === 'GMx')
      .map((d) => ({ diputado: d.diputado, voto: VOTOS[d.voto] }))
      .sort((a, b) => a.diputado.localeCompare(b.diputado, 'es')),
    enlaces: await enlaces(dia, info.sesion, info.numeroVotacion),
  });
}

salida.sort((a, b) => b.fecha.localeCompare(a.fecha));
writeFileSync('src/data/votaciones.json', JSON.stringify(salida, null, 2) + '\n');
console.log(`${salida.length} votaciones → src/data/votaciones.json`);
