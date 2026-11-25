// Candidaturas al Senado (BOE-A-2026-23103) y la consulta de candidaturas del chat
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearCandidaturas, idCandidaturas } from '../api/_candidaturas.js';

const leer = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'));
const senado = leer('senado-2026.json');
const congreso2023 = leer('congreso-2023.json');
const senado2023 = leer('senado-2023.json');
const c = crearCandidaturas(leer('candidaturas-2026.json'), senado, leer('escanos-2026.json'), congreso2023, senado2023);

test('el Senado tiene las 52 provincias y 60 circunscripciones (Baleares y Canarias por islas)', () => {
  assert.equal(senado.provincias.length, 52);
  const circs = senado.provincias.flatMap((p) => p.circunscripciones);
  assert.equal(circs.length, 60);
  assert.equal(circs.filter((x) => x.isla).length, 11);
  for (const id of ['07', '35', '38']) assert.ok(senado.provincias.find((p) => p.id === id).circunscripciones.every((x) => x.isla), id);
});

test('escaños y nombres que se pueden marcar siguen la ley electoral (arts. 165 y 166)', () => {
  for (const p of senado.provincias) {
    for (const x of p.circunscripciones) {
      const esperado = x.isla ? (['Mallorca', 'Gran Canaria', 'Tenerife'].includes(x.isla) ? [3, 2] : [1, 1]) : ['51', '52'].includes(p.id) ? [2, 2] : [4, 3];
      assert.deepEqual([x.escanos, x.votos], esperado, `${p.id} ${x.isla ?? ''}`);
    }
  }
});

test('cada candidatura al Senado tiene titulares, sin suplentes ni partidos pegados al nombre', () => {
  for (const p of senado.provincias) {
    for (const x of p.circunscripciones) {
      assert.ok(x.candidaturas.length > 0, `${p.id} ${x.isla ?? ''}`);
      for (const k of x.candidaturas) {
        // Nadie presenta más candidatos que escaños en juego (en provincias, como mucho los nombres que se pueden marcar)
        const limite = x.escanos === 4 ? x.votos : x.escanos;
        assert.ok(k.candidatos.length >= 1 && k.candidatos.length <= limite, `${p.id} ${x.isla ?? ''} ${k.texto}: ${k.candidatos.length}`);
        for (const n of k.candidatos) {
          assert.doesNotMatch(n, /Suplente|[[\]]|\([^)]*$|\)$/, `${p.id} ${n}`);
          assert.ok(n.split(' ').length >= 2, `${p.id} ${n}`);
        }
      }
    }
  }
});

test('Asturias: siete candidaturas y tres nombres por votante', () => {
  const r = c.consultar({ provincia: 'Asturias', camara: 'senado' });
  assert.equal(r.provincia, 'Asturias');
  assert.equal(r.senado.circunscripciones.length, 1);
  assert.equal(r.senado.circunscripciones[0].nombres_que_puede_marcar_cada_votante, 3);
  assert.equal(r.senado.circunscripciones[0].candidaturas.length, 7);
  assert.equal(r.congreso, undefined);
});

test('el chat reconoce todas las provincias, las islas y nombres habituales', () => {
  for (const p of congreso2023) assert.equal(c.resolver(p.nombre)?.id, p.id, p.nombre);
  for (const [texto, id, isla] of [['Ibiza', '07', 'Eivissa'], ['tenerife', '38', 'Tenerife'], ['Gran Canaria', '35', 'Gran Canaria'], ['Vizcaya', '48'], ['Orense', '32'], ['la provincia de Lleida', '25']]) {
    const r = c.resolver(texto);
    assert.equal(r?.id, id, texto);
    if (isla) assert.equal(r.isla, isla, texto);
  }
  assert.equal(c.resolver('Narnia'), null);
});

test('cada consulta lleva su cita, que enlaza a la página de su provincia', () => {
  const r = c.consultar({ provincia: 'Tenerife' });
  assert.equal(r.senado.id, idCandidaturas('38', 'senado'));
  assert.equal(r.congreso.id, idCandidaturas('38', 'congreso'));
  assert.equal(c.fuente(r.senado.id).enlace, '/tu-voto/santa-cruz-de-tenerife#senado');
  assert.equal(c.fuente(r.congreso.id).enlace, '/tu-voto/santa-cruz-de-tenerife#quien');
  // No choca con los identificadores de las propuestas
  assert.ok(idCandidaturas('01', 'congreso') > leer('propuestas.json').length);
});

test('Senado 2023: 208 elegidos, y en cada circunscripción los elegidos son los más votados', () => {
  const circs = senado2023.provincias.flatMap((p) => p.circunscripciones);
  assert.equal(circs.reduce((n, x) => n + x.candidatos.filter((k) => k.elegido).length, 0), 208);
  for (const x of circs) {
    const orden = [...x.candidatos].sort((a, b) => b.votos - a.votos);
    assert.ok(orden.slice(0, x.escanos).every((k) => k.elegido), x.isla ?? 'provincia');
  }
});

test('el chat da el resultado del Senado de 2023 con su cita', () => {
  const r = c.consultar({ provincia: 'Asturias', camara: 'senado' }).senado.resultado_2023;
  const ast = r.circunscripciones[0];
  assert.equal(ast.elegidos.length, 4);
  assert.equal(ast.votos_de_diferencia_entre_el_ultimo_elegido_y_el_primero_fuera, ast.elegidos[3].votos - ast.primeros_no_elegidos[0].votos);
  assert.equal(c.fuente(r.id).enlace, '/tu-voto/asturias#senado-2023');
  // En 2023 Eivissa y Formentera votaban juntas
  const ibiza = c.consultar({ provincia: 'Formentera', camara: 'senado' }).senado.resultado_2023;
  assert.deepEqual(ibiza.circunscripciones.map((x) => x.isla), ['Eivissa-Formentera']);
});
