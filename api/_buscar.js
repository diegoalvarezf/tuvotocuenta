// Buscador de propuestas para el chat. Es lo único que el chat puede consultar: las propuestas publicadas
// (revisadas) de src/data/propuestas.json, cada una con su cita literal y el enlace a su página.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const VACIAS = new Set(
  'a al algo ante bajo cada como con contra cual cuales cuando de del desde donde dos el ella ellas ellos en entre era es esa ese eso esta este esto estos ha hace hacer hacia han hasta hay la las le les lo los mas me mi muy ni no nos o os otra otro para pero poco por porque que quien quienes se sea ser si sin sobre son su sus tambien tan tanto te tiene tienen todo todos tras tu un una uno unas unos va van y ya dice dicen propone proponen propuesta propuestas partido partidos programa programas quiere quieren plantea plantean'.split(' '),
);

// Sin tildes ni signos, en minúsculas
const plano = (t) => t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9ñ]+/g, ' ').trim();
// Raíz aproximada: quita plurales y terminaciones frecuentes para que «alquileres» encuentre «alquiler»
const raiz = (p) => (p.length > 5 ? p.replace(/(es|s)$/, '') : p.length > 4 ? p.replace(/s$/, '') : p);
export const palabras = (t) => plano(t).split(' ').filter((p) => p.length > 1 && !VACIAS.has(p)).map(raiz);

export function crearBuscador(propuestas, programas) {
  const formaciones = new Map(programas.map((p) => [p.siglas, p]));
  const fuente = (siglas) => formaciones.get(siglas)?.programa ?? formaciones.get(siglas)?.documentos?.[0];
  // Mismo enlace que la página de propuestas: la página del PDF o la copia guardada de la web con la cita resaltada
  const enlace = (p) => {
    const f = fuente(p.partido);
    if (f?.web) return `${f.archivo}#:~:text=${encodeURIComponent(p.cita.split(' · ')[0].split(/\s+/).slice(0, 8).join(' '))}`;
    return `${p.documento ?? f?.url}#page=${p.pagina}`;
  };

  const docs = propuestas
    .map((p, id) => ({ p, id }))
    .filter(({ p }) => p.revisada)
    .map(({ p, id }) => {
      // El resumen pesa el doble: está en castellano aunque la cita esté en otra lengua
      // El tema también cuenta: «inmigración» encuentra todo lo clasificado ahí aunque no use la palabra
      const terminos = [...palabras(p.resumen), ...palabras(p.resumen), ...palabras(p.cita), ...palabras(p.tema)];
      const cuenta = new Map();
      for (const t of terminos) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
      return {
        id,
        p,
        cuenta,
        largo: terminos.length,
      };
    });

  const frecuencia = new Map();
  for (const d of docs) for (const t of d.cuenta.keys()) frecuencia.set(t, (frecuencia.get(t) ?? 0) + 1);
  const media = docs.reduce((s, d) => s + d.largo, 0) / Math.max(1, docs.length);
  const idf = (t) => Math.log(1 + (docs.length - (frecuencia.get(t) ?? 0) + 0.5) / ((frecuencia.get(t) ?? 0) + 0.5));

  const salida = (d) => {
    const f = formaciones.get(d.p.partido);
    return {
      id: d.id,
      partido: f?.corto ?? d.p.partido,
      tema: d.p.tema,
      resumen: d.p.resumen,
      cita: d.p.cita,
      pagina: fuente(d.p.partido)?.web ? null : d.p.pagina,
      concreta: d.p.concreta,
      enlace: enlace(d.p),
    };
  };

  // Siglas de las formaciones que responden a un nombre: primero el nombre exacto («PP» no es «UPN-PP») y,
  // si no hay, las que lo contienen como palabra completa («Compromís» → su coalición)
  const nombresDe = programas.map((f) => ({ siglas: f.siglas, exactos: [f.siglas, f.corto, f.nombre].map(plano), todo: ` ${plano(`${f.siglas} ${f.corto} ${f.nombre}`)} ` }));
  function resolver(nombre) {
    const n = plano(nombre);
    if (!n) return [];
    const exactas = nombresDe.filter((f) => f.exactos.includes(n));
    return (exactas.length ? exactas : nombresDe.filter((f) => f.todo.includes(` ${n} `))).map((f) => f.siglas);
  }

  /**
   * @param {{ consulta?: string, partidos?: string[], tema?: string, soloConcretas?: boolean, maximo?: number }} filtros
   */
  function buscar({ consulta = '', partidos = [], tema, soloConcretas = false, maximo } = {}) {
    // Si se pregunta por una sola formación caben más resultados
    maximo ??= partidos.length === 1 ? 24 : 14;
    const pedidas = new Set(partidos.flatMap(resolver));
    const filtraPartido = partidos.length > 0;
    const candidatos = docs.filter(
      (d) => (!tema || d.p.tema === tema) && (!soloConcretas || d.p.concreta) && (!filtraPartido || pedidas.has(d.p.partido)),
    );
    const terminos = [...new Set(palabras(consulta))];
    let ordenados;
    if (terminos.length === 0) {
      // Sin palabras: por formación y página, como en la web
      ordenados = candidatos.map((d) => ({ d, puntos: 0 }));
    } else {
      // BM25
      ordenados = candidatos
        .map((d) => {
          let puntos = 0;
          for (const t of terminos) {
            const n = d.cuenta.get(t);
            if (n) puntos += (idf(t) * n * 2.2) / (n + 1.2 * (0.25 + (0.75 * d.largo) / media));
          }
          return { d, puntos };
        })
        .filter((x) => x.puntos > 0)
        .sort((a, b) => b.puntos - a.puntos || a.d.id - b.d.id);
    }
    // Reparto entre formaciones: si no se pide una sola, ninguna ocupa más de un cuarto de los resultados
    const tope = pedidas.size === 1 ? maximo : Math.max(2, Math.ceil(maximo / 4));
    const porPartido = new Map();
    const elegidos = [];
    for (const { d } of ordenados) {
      const n = porPartido.get(d.p.partido) ?? 0;
      if (n >= tope) continue;
      porPartido.set(d.p.partido, n + 1);
      elegidos.push(d);
      if (elegidos.length >= maximo) break;
    }
    // Cuántas coincidencias tiene cada formación, también las que no caben en los resultados:
    // así el chat puede decir quién más habla del asunto en vez de callarlo
    const recuentoPorFormacion = new Map();
    for (const { d } of ordenados) {
      const nombre = formaciones.get(d.p.partido)?.corto ?? d.p.partido;
      recuentoPorFormacion.set(nombre, (recuentoPorFormacion.get(nombre) ?? 0) + 1);
    }
    return { total: ordenados.length, porFormacion: Object.fromEntries(recuentoPorFormacion), propuestas: elegidos.map(salida) };
  }

  // Lo que el chat sabe de cada formación sin buscar: si tiene propuestas publicadas y cuántas
  const recuento = new Map();
  for (const d of docs) recuento.set(d.p.partido, (recuento.get(d.p.partido) ?? 0) + 1);
  const resumenFormaciones = programas.map((f) => ({ nombre: f.corto, nombreCompleto: f.nombre, propuestas: recuento.get(f.siglas) ?? 0 }));

  return { buscar, resolver, resumenFormaciones, total: docs.length };
}

let cache;
// Lee los datos una vez por instancia del servidor
export function buscador() {
  if (!cache) {
    const leer = (f) => JSON.parse(readFileSync(join(process.cwd(), 'src/data', f), 'utf8'));
    cache = crearBuscador(leer('propuestas.json'), leer('programas.json'));
  }
  return cache;
}
