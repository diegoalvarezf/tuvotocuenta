// El cálculo de escaños debe reproducir exactamente el resultado oficial de 2023
import assert from 'node:assert/strict';
import { test } from 'node:test';
import resultados from '../src/data/congreso-2023.json' with { type: 'json' };
import escanos2026 from '../src/data/escanos-2026.json' with { type: 'json' };
import { repartir } from '../src/lib/dhondt.ts';

test('D\'Hondt reproduce los escaños oficiales de 2023 en las 52 provincias', () => {
  assert.equal(resultados.length, 52);
  for (const p of resultados) {
    const r = repartir(p.candidaturas.map((c, i) => ({ id: String(i), votos: c.votos })), p.escanos, p.votosValidos);
    p.candidaturas.forEach((c, i) => assert.equal(r.get(String(i)), c.escanos, `${p.nombre}, ${c.siglas}`));
  }
});

test('2023 y 2026 suman 350 escaños', () => {
  assert.equal(resultados.reduce((s, p) => s + p.escanos, 0), 350);
  assert.equal(escanos2026.reduce((s, p) => s + p.escanos, 0), 350);
  assert.equal(escanos2026.length, 52);
});

test('el mínimo del 3 % deja fuera a quien no lo alcanza', () => {
  // 100 votos válidos: B tiene 2 (< 3 %) y no puede entrar aunque sobren escaños
  const r = repartir([{ id: 'A', votos: 98 }, { id: 'B', votos: 2 }], 5, 100);
  assert.equal(r.get('A'), 5);
  assert.equal(r.get('B'), 0);
});

test('los votos en blanco cuentan para el 3 %', () => {
  // B tiene el 3,1 % de los votos a candidaturas, pero con los blancos baja del 3 %
  // Con 40 escaños, B sacaría uno si supera el mínimo
  const sinBlancos = repartir([{ id: 'A', votos: 969 }, { id: 'B', votos: 31 }], 40, 1000);
  const conBlancos = repartir([{ id: 'A', votos: 969 }, { id: 'B', votos: 31 }], 40, 1100);
  assert.ok(sinBlancos.get('B') > 0);
  assert.equal(conBlancos.get('B'), 0);
});
