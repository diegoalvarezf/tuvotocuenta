import { test } from 'node:test';
import assert from 'node:assert/strict';
import candidaturas from '../src/data/candidaturas-2026.json' with { type: 'json' };
import escanos from '../src/data/escanos-2026.json' with { type: 'json' };
import programas from '../src/data/programas.json' with { type: 'json' };


test('hay candidaturas en las 52 circunscripciones', () => {
  assert.equal(candidaturas.provincias.length, 52);
  assert.equal(new Set(candidaturas.provincias.map((p) => p.id)).size, 52);
});

test('cada lista tiene tantos titulares como escaños reparte su provincia', () => {
  for (const p of candidaturas.provincias) {
    const { escanos: n } = escanos.find((e) => e.id === p.id);
    for (const c of p.candidaturas) {
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

// Desde el 20-11-2026 cuentan también programas cortos si la formación los presenta como su programa (decisión de Diego)
test('un programa tiene páginas y un enlace, o es una página web con su copia en archive.org', () => {
  for (const p of programas.filter((x) => x.programa)) {
    if (p.programa.web) assert.match(p.programa.archivo ?? '', /^https:\/\/web\.archive\.org\/web\/\d{14}\//, p.corto);
    else assert.ok(p.programa.paginas >= 1, p.corto);
    assert.match(p.programa.url, /^https:/, p.corto);
  }
});
