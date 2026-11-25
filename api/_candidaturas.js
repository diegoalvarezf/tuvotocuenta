// Candidaturas proclamadas (BOE-A-2026-23103) para el chat: Congreso y Senado por provincia, y en el Senado por isla
// en Baleares y Canarias. Como las propuestas, cada respuesta lleva un identificador que el chat cita y la página
// convierte en un enlace a la lista completa en «Tu voto».
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const plano = (t) => t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Igual que src/lib/provincias.ts: URL con el nombre más buscado
const SLUGS = { '01': 'alava', '03': 'alicante', '07': 'baleares', '12': 'castellon', '46': 'valencia' };
const slug = (id, nombre) => SLUGS[id] ?? plano(nombre).replace(/ /g, '-');

// Nombres en otra lengua o antiguos que la gente escribe
const OTROS = {
  '01': ['alava', 'araba', 'vitoria'], '03': ['alicante', 'alacant'], '07': ['baleares', 'islas baleares', 'illes balears', 'palma'],
  '12': ['castellon', 'castello'], '15': ['coruna', 'la coruna'], '17': ['gerona'], '20': ['guipuzcoa', 'san sebastian', 'donostia'],
  '25': ['lerida'], '32': ['orense'], '33': ['oviedo', 'gijon', 'principado de asturias'], '35': ['gran canaria'], '38': ['tenerife'],
  '39': ['santander'], '46': ['valencia'], '48': ['vizcaya', 'bilbao'], '31': ['pamplona', 'iruna'], '26': ['logrono'],
};
const ISLAS = { ibiza: 'Eivissa', eivissa: 'Eivissa' };

// Identificador de la cita: fuera del rango de las propuestas (que son 0, 1, 2…)
export const idCandidaturas = (provincia, camara) => 900000 + Number(provincia) * 10 + (camara === 'senado' ? 2 : 1);

// Nombres y URL como en «Tu voto» (resultados de 2023); escaños, los de 2026
export function crearCandidaturas(congreso, senado, escanos, resultados2023) {
  const provincias = resultados2023.map((r) => ({ id: r.id, nombre: r.nombre.split('/').at(-1), escanos: escanos.find((e) => e.id === r.id).escanos, slug: slug(r.id, r.nombre) }));
  const indice = new Map();
  for (const p of provincias) {
    for (const n of [p.nombre, ...p.nombre.split('/'), p.slug.replace(/-/g, ' '), ...(OTROS[p.id] ?? [])]) indice.set(plano(n), { id: p.id });
  }
  for (const s of senado.provincias) for (const c of s.circunscripciones) if (c.isla) indice.set(plano(c.isla), { id: s.id, isla: c.isla });
  for (const [n, isla] of Object.entries(ISLAS)) indice.set(n, { id: '07', isla });

  function resolver(texto) {
    const t = plano(texto ?? '');
    if (!t) return null;
    if (indice.has(t)) return indice.get(t);
    // «provincia de Asturias», «en Tenerife»…: la coincidencia más larga contenida en el texto
    const candidatos = [...indice.keys()].filter((k) => k.length > 3 && ` ${t} `.includes(` ${k} `)).sort((a, b) => b.length - a.length);
    return candidatos.length ? indice.get(candidatos[0]) : null;
  }

  function consultar({ provincia, camara = 'ambas' } = {}) {
    const lugar = resolver(provincia);
    if (!lugar) {
      return { error: 'No reconozco esa provincia. Pide al usuario que diga su provincia (o su isla en Baleares y Canarias).', provincias: provincias.map((p) => p.nombre) };
    }
    const p = provincias.find((x) => x.id === lugar.id);
    const enlace = `/tu-voto/${p.slug}`;
    const salida = { provincia: p.nombre, enlace };
    if (camara !== 'senado') {
      const c = congreso.provincias.find((x) => x.id === p.id);
      salida.congreso = {
        id: idCandidaturas(p.id, 'congreso'),
        diputados: p.escanos,
        como_se_vota: 'Se vota una lista cerrada y bloqueada de una candidatura; los escaños se reparten entre listas con la ley D’Hondt (mínimo del 3 % de los votos válidos).',
        candidaturas: c.candidaturas.map((k) => ({ candidatura: k.texto, cabeza_de_lista: k.candidatos[0], personas_en_la_lista: k.candidatos.length })),
      };
    }
    if (camara !== 'congreso') {
      const s = senado.provincias.find((x) => x.id === p.id);
      const circs = s.circunscripciones.filter((c) => !lugar.isla || c.isla === lugar.isla);
      salida.senado = {
        id: idCandidaturas(p.id, 'senado'),
        como_se_vota: 'Se vota a personas: en la papeleta del Senado se marcan nombres, de una o de varias candidaturas, hasta el máximo indicado. Salen elegidos los más votados.',
        circunscripciones: circs.map((c) => ({
          ...(c.isla && { isla: c.isla }),
          senadores_que_se_eligen: c.escanos,
          nombres_que_puede_marcar_cada_votante: c.votos,
          candidaturas: c.candidaturas.map((k) => ({ candidatura: k.texto, candidatos: k.candidatos })),
        })),
        ...(!lugar.isla && circs.length > 1 && { nota: 'En esta provincia el Senado se vota por islas: cada votante solo ve las candidaturas de su isla.' }),
      };
    }
    return salida;
  }

  // Lo que la página necesita para enlazar la cita
  function fuente(id) {
    const n = Number(id) - 900000;
    const camara = n % 10 === 2 ? 'senado' : 'congreso';
    const p = provincias.find((x) => Number(x.id) === Math.floor(n / 10));
    if (!p) return null;
    const nombreCamara = camara === 'senado' ? 'Senado' : 'Congreso';
    return {
      partido: `${nombreCamara} · ${p.nombre}`,
      origen: `Candidaturas al ${nombreCamara} en ${p.nombre} · BOE-A-2026-23103`,
      cita: `Candidaturas proclamadas por la Junta Electoral de ${p.nombre}, publicadas en el BOE del 3 de noviembre de 2026.`,
      pagina: null,
      enlace: `/tu-voto/${p.slug}#${camara === 'senado' ? 'senado' : 'quien'}`,
      textoEnlace: 'Ver todas las candidaturas en Tu voto',
    };
  }

  return { consultar, fuente, resolver };
}

let cache;
export function candidaturas() {
  if (!cache) {
    const leer = (f) => JSON.parse(readFileSync(join(process.cwd(), 'src/data', f), 'utf8'));
    cache = crearCandidaturas(leer('candidaturas-2026.json'), leer('senado-2026.json'), leer('escanos-2026.json'), leer('congreso-2023.json'));
  }
  return cache;
}
