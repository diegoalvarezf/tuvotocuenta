// Votaciones del Congreso para el chat: las votaciones clave de «Lo que votaron» (qué votó cada grupo), los decretos ley
// con su resultado oficial y la coincidencia de voto entre grupos. Como las propuestas, cada respuesta lleva un
// identificador que el chat cita y la página convierte en un enlace a la votación o al BOE.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { palabras } from './_buscar.js';

const BASE = { votacion: 800000, decreto: 810000, pendiente: 820000, coincidencias: 830000 };
const SENTIDO = { si: 'sí', no: 'no', abstencion: 'abstención', noVota: 'no votó' };
const fechaLarga = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const plano = (t) => t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
// Palabras que están en casi todos los títulos y no distinguen una votación de otra
const COMUNES = new Set(['ley', 'real', 'decreto', 'decretos', 'rdl', 'medida', 'medidas', 'urgente', 'urgentes', 'materia', 'voto', 'votaron', 'votacion', 'votaciones', 'congreso', 'grupo', 'grupos', 'reforma']);

export function crearVotaciones(votaciones, decretos, pendientes, coincidencias) {
  const nombreGrupo = new Map(coincidencias.grupos.map((g) => [g.codigo, g.nombre]));
  // Cuántas palabras de la consulta aparecen en el texto de cada elemento
  const indexar = (lista, texto) => lista.map((x, i) => ({ x, i, terminos: new Set(palabras(texto(x))) }));
  const iVotaciones = indexar(votaciones, (v) => `${v.nombre} ${v.nombre} ${v.tema} ${v.resumen} ${v.oficial?.expediente ?? ''}`);
  const iDecretos = indexar(decretos, (d) => `${d.nombre} ${d.titulo}`);
  const iPendientes = indexar(pendientes, (d) => `${d.nombre} ${d.titulo} ${d.tema ?? ''}`);
  const puntuar = (indice, terminos) =>
    indice
      .map((e) => ({ ...e, puntos: terminos.filter((t) => e.terminos.has(t)).length }))
      .filter((e) => e.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos || a.i - b.i)
      // Solo lo que se acerca a la mejor coincidencia: una palabra suelta no arrastra media lista
      .filter((e, _, todos) => e.puntos * 2 >= todos[0].puntos);
  // Un decreto se puede pedir por su número: «decreto 28/2026», «RDL 28»
  const numero = (consulta) => consulta.match(/\b(\d{1,2})\s*\/\s*(20\d\d)\b/) ?? consulta.match(/\b(?:rdl|decreto(?:-ley)?|decreto ley)\s+(\d{1,2})\b/i);
  const esDecreto = (d, m) => new RegExp(`\\b${m[1]}/${m[2] ?? '2026'}$`).test(d.nombre);

  const salidaVotacion = ({ x: v, i }) => ({
    id: BASE.votacion + i,
    fecha: v.fecha,
    tema: v.tema,
    nombre: v.nombre,
    que_se_votaba: v.resumen,
    votar_si_significaba: v.siSignifica,
    ...(v.nota && { nota: v.nota }),
    resultado: v.gana === 'si' ? 'ganó el sí' : 'ganó el no',
    totales: { si: v.totales.si, no: v.totales.no, abstencion: v.totales.abstencion },
    voto_de_cada_grupo: v.grupos.filter((g) => g.codigo).map((g) => ({ grupo: g.nombre, voto: SENTIDO[g.sentido] ?? g.sentido, si: g.si, no: g.no, abstencion: g.abstencion })),
  });
  const salidaDecreto = ({ x: d, i }) => ({
    id: BASE.decreto + i,
    decreto: d.nombre,
    titulo: mayuscula(d.titulo),
    fecha_votacion: d.votacion,
    resultado: d.resultado,
    organo: d.organo ?? 'Pleno del Congreso',
    ...(d.totales && { totales: d.totales }),
    ...(d.grupos ? { voto_de_cada_grupo: Object.entries(d.grupos).map(([c, s]) => ({ grupo: nombreGrupo.get(c) ?? c, voto: SENTIDO[s] ?? s })) } : { nota: 'No hay datos publicados del voto de cada grupo en esta votación.' }),
  });
  const salidaPendiente = ({ x: d, i }) => ({
    id: BASE.pendiente + i,
    decreto: d.nombre,
    titulo: mayuscula(d.titulo.replace(/\.$/, '')),
    publicado_en_el_boe: d.fecha,
    ...(d.resultado
      ? { fecha_votacion: d.votacion, resultado: d.resultado, organo: 'Diputación Permanente', totales: d.totales, nota: 'No hay datos publicados del voto de cada grupo en esta votación.' }
      : { resultado: 'pendiente de votar en la Diputación Permanente (las Cortes están disueltas)' }),
  });

  /**
   * @param {{ consulta?: string, tipo?: 'votaciones' | 'decretos' | 'coincidencias' | 'todo', grupo?: string }} filtros
   */
  function consultar({ consulta = '', tipo = 'todo', grupo = '' } = {}) {
    const salida = {};
    const terminos = [...new Set(palabras(consulta))].filter((t) => !COMUNES.has(t));
    if (tipo === 'coincidencias') {
      const g = plano(grupo).trim();
      const elegidos = g ? coincidencias.grupos.filter((x) => plano(`${x.nombre} ${x.codigo}`).includes(g)) : [];
      salida.coincidencia_de_voto = {
        id: BASE.coincidencias,
        que_es: `Porcentaje de las ${coincidencias.total} votaciones del Pleno (2023-2026) en que dos grupos votaron lo mismo. Cálculo propio de tuvotocuenta.es con los datos abiertos del Congreso.`,
        grupos: (elegidos.length ? elegidos : coincidencias.grupos).map((x) => ({ grupo: x.nombre, coincide_con: x.con.map((c) => ({ grupo: c.nombre, porcentaje: c.porcentaje })) })),
      };
      return salida;
    }
    if (tipo !== 'decretos') {
      const hallados = puntuar(iVotaciones, terminos).slice(0, 5);
      salida.votaciones = hallados.map(salidaVotacion);
      // Sin coincidencias, la lista completa de votaciones clave para que el chat elija o diga que no está
      if (!hallados.length) salida.votaciones_disponibles = votaciones.map((v, i) => ({ id: BASE.votacion + i, fecha: v.fecha, tema: v.tema, nombre: v.nombre }));
    }
    if (tipo !== 'votaciones') {
      const m = numero(consulta);
      const votados = m ? iDecretos.filter((e) => esDecreto(e.x, m)) : puntuar(iDecretos, terminos).slice(0, 6);
      const sinAcuerdo = m ? iPendientes.filter((e) => esDecreto(e.x, m)) : puntuar(iPendientes, terminos).slice(0, 6);
      const votadosDP = pendientes.filter((d) => d.resultado).length;
      salida.decretos_ley = {
        resumen: {
          votados: decretos.length + votadosDP,
          derogados: decretos.filter((d) => d.resultado === 'derogado').length + pendientes.filter((d) => d.resultado === 'derogado').length,
          pendientes_de_votar: pendientes.length - votadosDP,
        },
        encontrados: [...sinAcuerdo.map(salidaPendiente), ...votados.map(salidaDecreto)],
        // Los que aún no se han votado se dan siempre: son pocos y es lo que más se pregunta
        pendientes_de_votar: iPendientes.filter((e) => !e.x.resultado).map(salidaPendiente),
        derogados: iDecretos.filter((e) => e.x.resultado === 'derogado').map(({ x, i }) => ({ id: BASE.decreto + i, decreto: x.nombre, titulo: mayuscula(x.titulo), fecha_votacion: x.votacion })),
      };
    }
    return salida;
  }

  // Lo que la página necesita para enlazar la cita
  function fuente(id) {
    const n = Number(id);
    if (n === BASE.coincidencias) {
      return {
        partido: 'Coincidencia de voto',
        origen: 'Coincidencia de voto entre grupos · cálculo propio con los datos abiertos del Congreso',
        cita: `Porcentaje de las ${coincidencias.total} votaciones del Pleno de la legislatura 2023-2026 en que dos grupos votaron lo mismo.`,
        pagina: null,
        enlace: '/votaciones#coincidencias-titulo',
        textoEnlace: 'Ver la coincidencia entre grupos en Lo que votaron',
      };
    }
    const v = votaciones[n - BASE.votacion];
    if (v) {
      return {
        partido: `Votación · ${v.nombre}`,
        origen: `Votación del Congreso · ${fechaLarga(v.fecha)} · ${v.nombre}`,
        cita: `${v.resumen} Resultado: ${v.totales.si} sí, ${v.totales.no} no y ${v.totales.abstencion} abstenciones.`,
        pagina: null,
        enlace: `/votaciones#${v.id}`,
        textoEnlace: 'Ver qué votó cada grupo y el acta oficial',
      };
    }
    const d = decretos[n - BASE.decreto];
    if (d) {
      return {
        partido: d.nombre,
        origen: `${d.nombre} · ${d.resultado} el ${fechaLarga(d.votacion)}`,
        cita: `${mayuscula(d.titulo)}.`,
        pagina: null,
        enlace: d.boe,
        textoEnlace: `Ver el acuerdo de ${d.resultado === 'derogado' ? 'derogación' : 'convalidación'} en el BOE`,
      };
    }
    const p = pendientes[n - BASE.pendiente];
    if (p) {
      return {
        partido: p.nombre,
        origen: p.resultado ? `${p.nombre} · ${p.resultado} el ${fechaLarga(p.votacion)}` : `${p.nombre} · pendiente de votar`,
        cita: `${mayuscula(p.titulo.replace(/\.$/, ''))}.`,
        pagina: null,
        enlace: p.resultado ? p.fuenteResultado.url : p.boe,
        textoEnlace: p.resultado ? 'Ver la nota oficial del Congreso' : 'Ver el decreto en el BOE',
      };
    }
    return null;
  }

  return { consultar, fuente };
}

let cache;
export function votaciones() {
  if (!cache) {
    const leer = (f) => JSON.parse(readFileSync(join(process.cwd(), 'src/data', f), 'utf8'));
    cache = crearVotaciones(leer('votaciones.json'), leer('decretos.json'), leer('decretos-pendientes.json'), leer('coincidencias.json'));
  }
  return cache;
}
