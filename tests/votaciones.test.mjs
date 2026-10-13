// Las votaciones destacadas deben cuadrar con los totales oficiales y tener su acta enlazada
import assert from 'node:assert/strict';
import { test } from 'node:test';
import votaciones from '../src/data/votaciones.json' with { type: 'json' };

test('el voto de los grupos suma el total oficial', () => {
  for (const v of votaciones) {
    for (const campo of ['si', 'no', 'abstencion']) {
      const suma = v.grupos.reduce((s, g) => s + g[campo], 0);
      assert.equal(suma, v.totales[campo], `${v.nombre}: ${campo}`);
    }
  }
});

test('el resultado mostrado coincide con los votos', () => {
  for (const v of votaciones) assert.equal(v.gana, v.totales.si > v.totales.no ? 'si' : 'no', v.nombre);
});

test('cada votación enlaza a su acta oficial del Congreso', () => {
  for (const v of votaciones) {
    assert.match(v.enlaces.pdf, /^https:\/\/www\.congreso\.es\/webpublica\/opendata\/votaciones\/.+\.pdf$/, v.nombre);
    assert.match(v.enlaces.json, /^https:\/\/www\.congreso\.es\/webpublica\/opendata\/votaciones\/.+\.json$/, v.nombre);
    assert.ok(v.resumen && v.siSignifica, `${v.nombre}: falta resumen o qué significa votar sí`);
  }
});
