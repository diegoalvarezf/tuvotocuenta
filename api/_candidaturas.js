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
const CAMARAS = { congreso: 1, senado: 2, senado2023: 3 };
export const idCandidaturas = (provincia, camara) => 900000 + Number(provincia) * 10 + CAMARAS[camara];

// Senado 2023 de una circunscripción: elegidos, los dos siguientes y la diferencia entre el último elegido y el primero fuera
function resumen2023(c) {
  const elegidos = c.candidatos.filter((x) => x.elegido);
  const fuera = c.candidatos.filter((x) => !x.elegido);
  const reparto = {};
  for (const x of elegidos) reparto[x.siglas] = (reparto[x.siglas] ?? 0) + 1;
  return {
    ...(c.isla && { isla: c.isla }),
    senadores_elegidos: c.escanos,
    reparto,
    elegidos: elegidos.map(({ nombre, siglas, votos }) => ({ nombre, siglas, votos })),
    primeros_no_elegidos: fuera.slice(0, 2).map(({ nombre, siglas, votos }) => ({ nombre, siglas, votos })),
    ...(fuera.length && { votos_de_diferencia_entre_el_ultimo_elegido_y_el_primero_fuera: elegidos.at(-1).votos - fuera[0].votos }),
  };
}

// Nombres y URL como en «Tu voto» (resultados de 2023); escaños, los de 2026
export function crearCandidaturas(congreso, senado, escanos, resultados2023, senado2023) {
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
        como_se_vota: 'Se vota a personas: en la papeleta del Senado se marcan con una cruz nombres, de una o de varias candidaturas, hasta el máximo indicado (se pueden marcar menos). Marcar más nombres del máximo o alterar la papeleta anula el voto; no marcar a nadie es voto en blanco válido. Salen elegidos los más votados. Guía completa: /tu-voto/senado.',
        circunscripciones: circs.map((c) => ({
          ...(c.isla && { isla: c.isla }),
          senadores_que_se_eligen: c.escanos,
          nombres_que_puede_marcar_cada_votante: c.votos,
          candidaturas: c.candidaturas.map((k) => ({ candidatura: k.texto, candidatos: k.candidatos })),
        })),
        ...(!lugar.isla && circs.length > 1 && { nota: 'En esta provincia el Senado se vota por islas: cada votante solo ve las candidaturas de su isla.' }),
      };
      const s23 = senado2023?.provincias.find((x) => x.id === p.id);
      if (s23) {
        // En 2023 Eivissa y Formentera votaban juntas («Eivissa-Formentera»)
        const c23 = s23.circunscripciones.filter((c) => !lugar.isla || c.isla?.split('-').includes(lugar.isla));
        salida.senado.resultado_2023 = {
          id: idCandidaturas(p.id, 'senado2023'),
          circunscripciones: c23.map(resumen2023),
          ...(p.id === '07' && { nota: 'En 2023 Eivissa y Formentera eran una sola circunscripción con un senador; en 2026 elige uno cada isla.' }),
        };
      }
    }
    return salida;
  }

  // Lo que la página necesita para enlazar la cita
  function fuente(id) {
    const n = Number(id) - 900000;
    const camara = n % 10 === 3 ? 'senado2023' : n % 10 === 2 ? 'senado' : 'congreso';
    const p = provincias.find((x) => Number(x.id) === Math.floor(n / 10));
    if (!p) return null;
    if (camara === 'senado2023') {
      return {
        partido: `Senado 2023 · ${p.nombre}`,
        origen: `Resultados del Senado 2023 en ${p.nombre} · Ministerio del Interior`,
        cita: `Votos de cada candidato al Senado en ${p.nombre} en las elecciones del 23 de julio de 2023 (resultados oficiales).`,
        pagina: null,
        enlace: `/tu-voto/${p.slug}#senado-2023`,
        textoEnlace: 'Ver el resultado completo en Tu voto',
      };
    }
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
    cache = crearCandidaturas(leer('candidaturas-2026.json'), leer('senado-2026.json'), leer('escanos-2026.json'), leer('congreso-2023.json'), leer('senado-2023.json'));
  }
  return cache;
}
