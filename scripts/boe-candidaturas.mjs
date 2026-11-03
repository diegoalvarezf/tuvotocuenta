// Genera src/data/candidaturas-2026.json a partir del texto del BOE con las candidaturas proclamadas al Congreso
// (BOE-A-2026-23103). Las marcadas «No proclamada» se guardan aparte: no se presentan.
//
// Uso: pdftotext -layout BOE-A-2026-23103.pdf texto.txt && node scripts/boe-candidaturas.mjs texto.txt

import { readFileSync, writeFileSync } from 'node:fs';

// Nombre de cada Junta Electoral en el BOE → código de provincia
const JUNTAS = {
  ALBACETE: '02', ALICANTE: '03', ALMERÍA: '04', ÁLAVA: '01', ASTURIAS: '33', ÁVILA: '05', BADAJOZ: '06', 'ILLES BALEARS': '07',
  BARCELONA: '08', BIZKAIA: '48', BURGOS: '09', CÁCERES: '10', CÁDIZ: '11', CANTABRIA: '39', CASTELLÓN: '12', 'CIUDAD REAL': '13',
  CÓRDOBA: '14', 'A CORUÑA': '15', CUENCA: '16', GIPUZKOA: '20', GIRONA: '17', GRANADA: '18', GUADALAJARA: '19', HUELVA: '21',
  HUESCA: '22', JAÉN: '23', LEÓN: '24', LLEIDA: '25', LUGO: '27', MADRID: '28', MÁLAGA: '29', MURCIA: '30', NAVARRA: '31',
  OURENSE: '32', PALENCIA: '34', 'LAS PALMAS': '35', PONTEVEDRA: '36', 'LA RIOJA': '26', SALAMANCA: '37',
  'SANTA CRUZ DE TENERIFE': '38', SEGOVIA: '40', SEVILLA: '41', SORIA: '42', TARRAGONA: '43', TERUEL: '44', TOLEDO: '45',
  VALENCIA: '46', VALLADOLID: '47', ZAMORA: '49', ZARAGOZA: '50', CEUTA: '51', MELILLA: '52',
};

const [ruta] = process.argv.slice(2);
if (!ruta) {
  console.error('Uso: node scripts/boe-candidaturas.mjs <texto del BOE>');
  process.exit(1);
}

// Fuera las cabeceras y pies de página del BOE
const lineas = readFileSync(ruta, 'utf8')
  .split('\n')
  .map((l) => l.replace(/\f/g, '').replace(/\s*(cve: BOE-A-\S+|Verificable en https:\S+)\s*$/, '').trim())
  .filter((l) => l && !/^BOLETÍN OFICIAL DEL ESTADO$/.test(l) && !/^Núm\. \d+\s+\S+ \d+ de \S+ de \d{4}/.test(l));

const esCabecera = (t) => {
  const letras = t.replace(/[^\p{L}]/gu, '');
  const mayus = letras.replace(/\p{Ll}/gu, '');
  return mayus.length / letras.length > 0.6;
};
// Una candidatura va en mayúsculas y entre paréntesis o sin punto final; las personas terminan en punto o van en minúsculas
const ENCABEZADO = /^(\d+)\.\s+(.+)$/;

const porProvincia = new Map();
let provincia = null;
let camara = null;
let actual = null;
let cortada = false;
const cerrar = () => {
  actual = null;
  cortada = false;
};

for (const [i, l] of lineas.entries()) {
  const junta = l.match(/^JUNTA ELECTORAL (?:PROVINCIAL )?DE (.+)$/);
  if (junta) {
    provincia = junta[1];
    camara = null;
    cerrar();
    continue;
  }
  if (l === 'CONGRESO DE LOS DIPUTADOS') { camara = 'congreso'; cerrar(); continue; }
  if (l === 'SENADO') { camara = 'senado'; cerrar(); continue; }
  if (camara !== 'congreso') continue;

  if (/^No proclamada/i.test(l) && actual) { actual.proclamada = false; cortada = false; continue; }

  const m = l.match(ENCABEZADO);
  const noProclamada = /^No proclamada/i.test(lineas[i + 1] ?? '');
  if (m && (noProclamada || ((esCabecera(m[2]) || /\([^)]*\)$/.test(m[2])) && !/\.$/.test(m[2])))) {
    const lista = porProvincia.get(provincia) ?? [];
    actual = { orden: Number(m[1]), texto: m[2], proclamada: true, candidatos: [] };
    lista.push(actual);
    porProvincia.set(provincia, lista);
    // El nombre sigue en la línea siguiente si el paréntesis no se ha cerrado o si no hay siglas todavía
    cortada = !/\)\]?$/.test(m[2]);
    continue;
  }
  if (!actual) continue;
  if (cortada && esCabecera(l)) {
    actual.texto += ' ' + l;
    cortada = !/\)\]?$/.test(l);
    continue;
  }
  cortada = false;
  if (/^Suplentes?:?$/i.test(l)) { actual.enSuplentes = true; continue; }
  if (/^Suplente \d/i.test(l)) { actual.enSuplentes = true; continue; }
  const p = l.match(/^(\d+)\.\s+(.+?)\.?$/);
  if (p && !actual.enSuplentes) {
    const nombre = p[2].replace(/\s*\(.*$/, '').trim();
    actual.candidatos.push(nombre);
  }
}

// Agrupa las variantes de una misma formación: ortografía, idioma y federaciones territoriales. Lo demás, por sus siglas.
const FORMACIONES = [
  [/SOCIALISTA|SOCIALISTES/i, 'PSOE', 'Partido Socialista Obrero Español'],
  [/^UNIÓN DEL PUEBLO NAVARRO/i, 'UPN-PP', 'Unión del Pueblo Navarro en coalición con el Partido Popular'],
  [/^PARTI[DT]O? POPULAR/i, 'PP', 'Partido Popular'],
  [/^VOX/i, 'Vox', 'Vox'],
  [/FR(ENTE|ONT|ONTE) AMPL|FRONTE ZABALA/i, 'Frente Amplio', 'Frente Amplio'],
  [/^PODEMOS/i, 'Podemos', 'Podemos'],
  [/^FRENTE OBRERO/i, 'Frente Obrero', 'Frente Obrero'],
  [/^SE ACAB[OÓ] LA FIESTA/i, 'SALF', 'Se Acabó la Fiesta'],
  [/COMUNISTA (DE LOS|DELS|DOS) TR|LANGILEEN/i, 'PCTE', 'Partido Comunista de los Trabajadores de España'],
  [/^PARTI[DT]O? ANIMALISTA/i, 'PACMA', 'Partido Animalista con el Medio Ambiente'],
  [/^POR UN MUNDO/i, 'Mundo+Justo', 'Por un Mundo Más Justo'],
  [/^ESCA[ÑN]OS EN B/i, 'Escaños en Blanco', 'Escaños en Blanco para Dejar Escaños Vacíos'],
  [/^FALANGE/i, 'FE de las JONS', 'Falange Española de las JONS'],
  [/^EUSKAL HERRIA BILDU/i, 'EH Bildu', 'Euskal Herria Bildu'],
  [/^ESQUERRA REPUBLICANA/i, 'ERC', 'Esquerra Republicana de Catalunya'],
  [/^JUNTS/i, 'Junts', 'Junts per Catalunya'],
  [/^EUZKO ALDERDI/i, 'PNV', 'Euzko Alderdi Jeltzalea-Partido Nacionalista Vasco'],
  [/^BLOQUE NACIONALISTA/i, 'BNG', 'Bloque Nacionalista Galego'],
  [/COALICIÓN CANARIA/i, 'CCa', 'Coalición Canaria'],
  [/^DEMOCRACIA PARA EL SIGLO 21/i, 'D21', 'Democracia para el Siglo 21'],
  [/^FEDERACION DE LOS INDEPENDIENTES DE ARAGON/i, 'FIA', 'Federación de los Independientes de Aragón'],
];

function partes(texto) {
  const m = texto.match(/^(.*?)\s*\(([^()]*)\)$/);
  return m ? { nombre: m[1], siglas: m[2] } : { nombre: texto, siglas: texto };
}
function formacion(texto) {
  const f = FORMACIONES.find(([re]) => re.test(texto));
  if (f) return { corto: f[1], nombre: f[2] };
  const { nombre, siglas } = partes(texto);
  return { corto: siglas, nombre };
}

const provincias = Object.entries(JUNTAS).map(([boe, id]) => {
  const lista = porProvincia.get(boe);
  if (!lista) throw new Error(`Sin candidaturas para ${boe}`);
  const textos = lista.map((c) => ({ ...c, texto: c.texto.replace(/\s+/g, ' ').trim() }));
  return {
    id,
    candidaturas: textos.filter((c) => c.proclamada).map((c) => ({ orden: c.orden, texto: c.texto, formacion: formacion(c.texto).corto, candidatos: c.candidatos })),
    noProclamadas: textos.filter((c) => !c.proclamada).map((c) => c.texto),
  };
});

writeFileSync('src/data/candidaturas-2026.json', JSON.stringify({ fuente: 'BOE-A-2026-23103', provincias }, null, 2) + '\n');

// Lista de programas: una entrada por formación, de más a menos circunscripciones. Conserva lo ya verificado (web, programa).
const anterior = JSON.parse(readFileSync('src/data/programas.json', 'utf8'));
const cuenta = new Map();
for (const p of provincias) for (const c of p.candidaturas) {
  const e = cuenta.get(c.formacion) ?? { ...formacion(c.texto), circunscripciones: new Set() };
  e.circunscripciones.add(p.id);
  cuenta.set(c.formacion, e);
}
const programas = [...cuenta.values()]
  .sort((a, b) => b.circunscripciones.size - a.circunscripciones.size || a.corto.localeCompare(b.corto, 'es'))
  .map((f) => {
    const previo = anterior.find((x) => x.corto === f.corto);
    return { siglas: previo?.siglas ?? f.corto, corto: f.corto, nombre: f.nombre, circunscripciones: f.circunscripciones.size, web: previo?.web ?? null, documentos: previo?.documentos ?? [], ...(previo?.aviso && { aviso: previo.aviso }), programa: previo?.programa ?? null };
  });
writeFileSync('src/data/programas.json', JSON.stringify(programas, null, 2) + '\n');
const total = provincias.reduce((n, p) => n + p.candidaturas.length, 0);
console.log(`${total} candidaturas proclamadas, ${programas.length} formaciones → src/data/candidaturas-2026.json, src/data/programas.json`);
