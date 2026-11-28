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

// Decretos cuyas votaciones no figuran en los datos abiertos del Pleno: los votados el 2-10-2026 y los que vota la
// Diputación Permanente con las Cortes disueltas.
// Resultado comprobado en la resolución del BOE; sin desglose de votos.
const EXTRA = [
  {
    nombre: 'Real Decreto-ley 24/2026',
    titulo: 'por el que se establecen medidas relacionadas con el plan de respuesta inmediata, reconstrucción y relanzamiento frente a los daños causados por la Depresión Aislada en Niveles Altos (DANA) en diferentes municipios entre el 28 de octubre y el 4 de noviembre de 2024',
    votacion: '2026-10-16',
    resultado: 'convalidado',
    organo: 'Diputación Permanente',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-21787',
  },
  {
    nombre: 'Real Decreto-ley 25/2026',
    titulo: 'por el que se adoptan y se prorrogan determinadas medidas en el marco del Plan Integral de Respuesta a la Crisis en Oriente Medio',
    votacion: '2026-10-16',
    resultado: 'convalidado',
    organo: 'Diputación Permanente',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-21788',
  },
  {
    nombre: 'Real Decreto-ley 26/2026',
    titulo: 'por el que se adoptan medidas urgentes para la protección de la función social de la vivienda y la ampliación de la oferta de vivienda asequible',
    votacion: '2026-10-02',
    resultado: 'derogado',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20526',
  },
  {
    nombre: 'Real Decreto-ley 27/2026',
    titulo: 'por el que se adoptan medidas urgentes para reforzar la estabilidad de los contratos de arrendamiento de vivienda habitual',
    votacion: '2026-10-02',
    resultado: 'derogado',
    boe: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20527',
  },
  // Votados por la Diputación Permanente el 12-11-2026; los votos, de la nota de prensa del Congreso
  {
    "nombre": "Real Decreto-ley 28/2026",
    "titulo": "por el que se adoptan medidas urgentes para reforzar la estabilidad de los contratos de arrendamiento de vivienda habitual",
    "votacion": "2026-11-12",
    "resultado": "derogado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-23754",
    "totales": {
      "si": 34,
      "no": 35
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 12 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52635"
    }
  },
  {
    "nombre": "Real Decreto-ley 29/2026",
    "titulo": "por el que se adoptan medidas urgentes para la protección de la función social de la vivienda y la ampliación de la oferta de vivienda asequible",
    "votacion": "2026-11-12",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-23755",
    "totales": {
      "si": 35,
      "no": 34
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 12 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52634"
    }
  },
  // Convalidados por la Diputación Permanente el 18-11-2026; los votos, de las notas de prensa del Congreso
  {
    "nombre": "Real Decreto-ley 30/2026",
    "titulo": "medidas extraordinarias y urgentes de apoyo financiero a la Ciudad de Ceuta",
    "votacion": "2026-11-18",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24291",
    "totales": {
      "si": 59,
      "no": 5,
      "abstencion": 1
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 18 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52653"
    }
  },
  {
    "nombre": "Real Decreto-ley 31/2026",
    "titulo": "para la mejora de la acción protectora de la Seguridad Social y de otras normas sociales",
    "votacion": "2026-11-18",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24292",
    "totales": {
      "si": 63,
      "no": 6,
      "abstencion": 0
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 18 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52655"
    }
  },
  {
    "nombre": "Real Decreto-ley 32/2026",
    "titulo": "ayudas a las víctimas del accidente ferroviario de Urda (Toledo) y garantía de accesibilidad equitativa a bienes y servicios en situaciones de emergencia",
    "votacion": "2026-11-18",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24293",
    "totales": {
      "si": 69,
      "no": 0,
      "abstencion": 0
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 18 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52657"
    }
  },
  {
    "nombre": "Real Decreto-ley 33/2026",
    "titulo": "medidas urgentes en respuesta a los daños causados por las inundaciones y otros sucesos de los días 17 a 19 de octubre de 2026, como consecuencia de la Depresión Aislada en Niveles Altos",
    "votacion": "2026-11-18",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24294",
    "totales": {
      "si": 63,
      "no": 6,
      "abstencion": 0
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 18 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52654"
    }
  },
  {
    "nombre": "Real Decreto-ley 34/2026",
    "titulo": "medidas urgentes para el refuerzo de la seguridad operacional en el transporte ferroviario y la protección social del personal ferroviario",
    "votacion": "2026-11-18",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24295",
    "totales": {
      "si": 63,
      "no": 6,
      "abstencion": 0
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 18 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52656"
    }
  },
  {
    "nombre": "Real Decreto-ley 35/2026",
    "titulo": "medidas urgentes para el reconocimiento y protección a las familias monoparentales y otras medidas de apoyo a familias",
    "votacion": "2026-11-18",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24296",
    "totales": {
      "si": 62,
      "no": 6,
      "abstencion": 1
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 18 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52658"
    }
  },
  {
    "nombre": "Real Decreto-ley 36/2026",
    "titulo": "medidas para el adecuado despliegue de la reforma del Sistema para la Autonomía y Atención a la Dependencia",
    "votacion": "2026-11-18",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-24297",
    "totales": {
      "si": 63,
      "no": 6,
      "abstencion": 0
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 18 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52659"
    }
  },
  // Convalidados por la Diputación Permanente el 26-11-2026; los votos, de las notas de prensa del Congreso
  {
    "nombre": "Real Decreto-ley 37/2026",
    "titulo": "medidas urgentes en materia de retribuciones del personal al servicio del sector público",
    "votacion": "2026-11-26",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-25020",
    "totales": {
      "si": 63,
      "no": 0,
      "abstencion": 0
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 26 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52733"
    }
  },
  {
    "nombre": "Real Decreto-ley 38/2026",
    "titulo": "recursos de los sistemas de financiación territorial y medidas fiscales urgentes para evitar la tributación del salario mínimo interprofesional de 2027 en el IRPF",
    "votacion": "2026-11-26",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-25021",
    "totales": {
      "si": 63,
      "no": 0,
      "abstencion": 0
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 26 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52734"
    }
  },
  {
    "nombre": "Real Decreto-ley 39/2026",
    "titulo": "modificación del Estatuto de los Trabajadores, de la igualdad retributiva entre mujeres y hombres, de la Ley de Empleo y de la transposición de la directiva europea de condiciones laborales transparentes",
    "votacion": "2026-11-26",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-25022",
    "totales": {
      "si": 63,
      "no": 0,
      "abstencion": 0
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 26 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52735"
    }
  },
  {
    "nombre": "Real Decreto-ley 40/2026",
    "titulo": "medidas urgentes para el impulso de la competitividad y la soberanía tecnológica en el ámbito científico e investigador",
    "votacion": "2026-11-26",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-25023",
    "totales": {
      "si": 35,
      "no": 1,
      "abstencion": 27
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 26 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52736"
    }
  },
  {
    "nombre": "Real Decreto-ley 41/2026",
    "titulo": "modificación de la ley que regula el régimen del comercio de derechos de emisión de gases de efecto invernadero",
    "votacion": "2026-11-26",
    "resultado": "convalidado",
    "organo": "Diputación Permanente",
    "boe": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-25024",
    "totales": {
      "si": 35,
      "no": 27,
      "abstencion": 1
    },
    "fuenteVotos": {
      "nombre": "Congreso de los Diputados, nota de prensa del 26 de noviembre de 2026",
      "url": "https://www.congreso.es/es/notas-de-prensa?p_p_id=notasprensa&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_notasprensa_mvcPath=detalle&_notasprensa_notaId=52737"
    }
  },
];
for (const e of EXTRA) {
  if (salida.some((d) => d.nombre === e.nombre)) continue;
  salida.push({ totales: null, grupos: null, sinDatosAbiertos: true, ...e });
  console.log(`${e.votacion} ${e.nombre}: ${e.resultado} (añadido desde el BOE)`);
}

writeFileSync('src/data/decretos.json', JSON.stringify(salida, null, 2) + '\n');
const derogados = salida.filter((d) => d.resultado === 'derogado').length;
console.log(`${salida.length} decretos: ${salida.length - derogados} convalidados, ${derogados} derogados → src/data/decretos.json`);
