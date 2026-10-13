// Si ya hay resultados del 29 de noviembre, deben cuadrar con los escaños del Real Decreto y con D'Hondt
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import escanos2026 from '../src/data/escanos-2026.json' with { type: 'json' };
import { repartir } from '../src/lib/dhondt.ts';

const ruta = new URL('../src/data/congreso-2026.json', import.meta.url);
const hay = existsSync(ruta);

test('resultados de 2026 coherentes con el Real Decreto y la ley D\'Hondt', { skip: !hay && 'aún no hay resultados de 2026' }, () => {
  const r = JSON.parse(readFileSync(ruta, 'utf8'));
  assert.equal(r.provincias.length, 52);
  assert.equal(r.provincias.reduce((s, p) => s + p.escanos, 0), 350);
  for (const p of r.provincias) {
    assert.equal(p.escanos, escanos2026.find((e) => e.id === p.id).escanos, p.nombre);
    const calc = repartir(p.candidaturas.map((c, i) => ({ id: String(i), votos: c.votos })), p.escanos, p.votosValidos);
    p.candidaturas.forEach((c, i) => assert.equal(calc.get(String(i)), c.escanos, `${p.nombre}, ${c.siglas}`));
  }
});
