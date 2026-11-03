import { test } from 'node:test';
import assert from 'node:assert/strict';
import candidaturas from '../src/data/candidaturas-2026.json' with { type: 'json' };
import escanos from '../src/data/escanos-2026.json' with { type: 'json' };
import programas from '../src/data/programas.json' with { type: 'json' };

// El BOE publica solo un titular de esta lista, en una provincia con 4 escaños
const EXCEPCIONES = new Set(['26:PARTIDO COMUNISTA DE LOS TRABAJADORES DE ESPAÑA (PCTE)']);

test('hay candidaturas en las 52 circunscripciones', () => {
  assert.equal(candidaturas.provincias.length, 52);
  assert.equal(new Set(candidaturas.provincias.map((p) => p.id)).size, 52);
});

test('cada lista tiene tantos titulares como escaños reparte su provincia', () => {
  for (const p of candidaturas.provincias) {
    const { escanos: n } = escanos.find((e) => e.id === p.id);
    for (const c of p.candidaturas) {
      if (EXCEPCIONES.has(`${p.id}:${c.texto}`)) continue;
      assert.equal(c.candidatos.length, n, `${p.id} ${c.texto}`);
    }
  }
});

test('la numeración del BOE no tiene huecos en ninguna provincia', () => {
  for (const p of candidaturas.provincias) {
    const n = p.candidaturas.length + p.noProclamadas.length;
    assert.ok(p.candidaturas.every((c) => c.orden >= 1 && c.orden <= n), p.id);
    assert.equal(new Set(p.candidaturas.map((c) => c.orden)).size, p.candidaturas.length, p.id);
  }
});

test('toda formación proclamada está en la lista de programas, y solo esas', () => {
  const proclamadas = new Set(candidaturas.provincias.flatMap((p) => p.candidaturas.map((c) => c.formacion)));
  assert.deepEqual(new Set(programas.map((x) => x.corto)), proclamadas);
});

test('un programa completo tiene 20 páginas o más y un enlace', () => {
  for (const p of programas.filter((x) => x.programa)) {
    assert.ok(p.programa.paginas >= 20, p.corto);
    assert.match(p.programa.url, /^https:/, p.corto);
  }
});
