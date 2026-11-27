// El chat solo puede leer las propuestas publicadas: se comprueba su buscador
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearBuscador } from '../api/_buscar.js';

const leer = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'));
const propuestas = leer('propuestas.json');
const programas = leer('programas.json');
const b = crearBuscador(propuestas, programas);

test('el buscador del chat solo contiene propuestas publicadas', () => {
  assert.equal(b.total, propuestas.filter((p) => p.revisada).length);
  const sinRevisar = crearBuscador([{ ...propuestas[0], revisada: false }], programas);
  assert.equal(sinRevisar.total, 0);
});

test('cada resultado lleva su cita literal y el enlace a su documento', () => {
  const r = b.buscar({ consulta: 'alquiler vivienda' });
  assert.ok(r.propuestas.length > 0);
  for (const x of r.propuestas) {
    assert.equal(propuestas[x.id].cita, x.cita);
    assert.match(x.enlace, /^https:\/\//, x.partido);
  }
});

test('«PP» no devuelve propuestas de «UPN-PP», y una coalición se encuentra por uno de sus nombres', () => {
  assert.deepEqual(b.resolver('PP'), ['PP']);
  assert.deepEqual(b.resolver('pp'), ['PP']);
  assert.ok(b.resolver('Compromís').length === 1);
  assert.deepEqual(b.resolver('partido que no existe'), []);
  const r = b.buscar({ consulta: 'pensiones', partidos: ['PP'], maximo: 50 });
  assert.ok(r.propuestas.every((x) => x.partido === 'PP'));
});

test('sin filtrar por formación, ninguna ocupa más de un cuarto de los resultados', () => {
  const r = b.buscar({ consulta: 'vivienda alquiler', maximo: 12 });
  const cuenta = {};
  for (const x of r.propuestas) cuenta[x.partido] = (cuenta[x.partido] ?? 0) + 1;
  assert.ok(Math.max(...Object.values(cuenta)) <= 3);
});

test('los filtros de tema y de concretas se respetan', () => {
  const r = b.buscar({ consulta: 'impuesto', tema: 'Impuestos', soloConcretas: true, maximo: 30 });
  assert.ok(r.propuestas.length > 0);
  assert.ok(r.propuestas.every((x) => x.tema === 'Impuestos' && x.concreta));
});

test('el servidor del chat rechaza lo que no es una pregunta válida y no responde sin clave', async () => {
  const { validar, GET, POST } = await import('../api/chat.js');
  assert.equal(validar({}), null);
  assert.equal(validar({ mensajes: [] }), null);
  assert.equal(validar({ mensajes: [{ rol: 'usuario', texto: 'x'.repeat(601) }] }), null);
  assert.equal(validar({ mensajes: [{ rol: 'sistema', texto: 'hola' }] }), null);
  assert.equal(validar({ mensajes: [{ rol: 'usuario', texto: 'hola' }, { rol: 'asistente', texto: 'qué tal' }] }), null);
  assert.deepEqual(validar({ mensajes: [{ rol: 'asistente', texto: 'a' }, { rol: 'usuario', texto: ' ¿Qué propone el PP? ' }] }), [{ role: 'user', content: '¿Qué propone el PP?' }]);

  const clave = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    assert.deepEqual(await GET().json(), { activo: false });
    const r = await POST(new Request('https://tuvotocuenta.es/api/chat', { method: 'POST', body: '{}' }));
    assert.equal(r.status, 503);
  } finally {
    if (clave) process.env.ANTHROPIC_API_KEY = clave;
  }
});

test('la búsqueda dice cuántas coincidencias tiene cada formación, también las que no caben', () => {
  const r = b.buscar({ consulta: 'salario mínimo', maximo: 6 });
  const suma = Object.values(r.porFormacion).reduce((x, y) => x + y, 0);
  assert.equal(suma, r.total);
  assert.ok(Object.keys(r.porFormacion).length > new Set(r.propuestas.map((x) => x.partido)).size);
});

test('el chat lee las votaciones, los decretos y la coincidencia de voto con su cita', async () => {
  const { crearVotaciones } = await import('../api/_votaciones.js');
  const votaciones = leer('votaciones.json');
  const decretos = leer('decretos.json');
  const pendientes = leer('decretos-pendientes.json');
  const v = crearVotaciones(votaciones, decretos, pendientes, leer('coincidencias.json'));

  // Una votación por su nombre: totales y voto de cada grupo, iguales a los publicados
  const amnistia = v.consultar({ consulta: 'ley de amnistía', tipo: 'votaciones' }).votaciones;
  assert.equal(amnistia.length, 1);
  const original = votaciones.find((x) => x.nombre === 'Ley de amnistía');
  assert.equal(amnistia[0].totales.si, original.totales.si);
  assert.equal(amnistia[0].voto_de_cada_grupo.length, original.grupos.filter((g) => g.codigo).length);
  assert.equal(v.fuente(amnistia[0].id).enlace, `/votaciones#${original.id}`);

  // Sin coincidencias no inventa: da la lista de votaciones publicadas
  const nada = v.consultar({ consulta: 'fútbol', tipo: 'votaciones' });
  assert.equal(nada.votaciones.length, 0);
  assert.equal(nada.votaciones_disponibles.length, votaciones.length);

  // Decretos: por número, con su resultado y el enlace al BOE; el recuento coincide con la página
  const d = v.consultar({ consulta: 'decreto 28/2026', tipo: 'decretos' }).decretos_ley;
  assert.deepEqual(d.encontrados.map((x) => [x.decreto, x.resultado]), [['Real Decreto-ley 28/2026', 'derogado']]);
  assert.match(v.fuente(d.encontrados[0].id).enlace, /^https:\/\/www\.boe\.es\//);
  assert.equal(d.resumen.votados + d.resumen.pendientes_de_votar, decretos.length + pendientes.length);
  assert.equal(d.pendientes_de_votar.length, pendientes.filter((x) => !x.resultado).length);
  for (const x of [...d.pendientes_de_votar, ...d.derogados]) assert.match(v.fuente(x.id).enlace, /^https:\/\//, x.decreto);

  // Coincidencia de voto: los porcentajes publicados, sin tocar
  const c = v.consultar({ tipo: 'coincidencias', grupo: 'Vox' }).coincidencia_de_voto;
  assert.deepEqual(c.grupos.map((g) => g.grupo), ['Vox']);
  assert.equal(v.fuente(c.id).enlace, '/votaciones#coincidencias-titulo');
  assert.equal(v.fuente(123), null);
});
