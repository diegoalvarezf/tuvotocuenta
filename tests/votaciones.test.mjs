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

test('cada decreto pendiente de votar enlaza a su texto en el BOE', async () => {
  const { default: pendientes } = await import('../src/data/decretos-pendientes.json', { with: { type: 'json' } });
  for (const d of pendientes) {
    assert.match(d.boe, /^https:\/\/www\.boe\.es\/diario_boe\/txt\.php\?id=BOE-A-\d{4}-\d+$/, d.nombre);
    assert.match(d.nombre, /^Real Decreto-ley \d+\/\d{4}$/);
  }
});

test('las citas de los programas de 2023 apuntan a votaciones existentes y a programas conocidos', async () => {
  const { default: citas } = await import('../src/data/votaciones-programas-2023.json', { with: { type: 'json' } });
  const { default: programas } = await import('../src/data/programas-2023.json', { with: { type: 'json' } });
  const ids = new Set(votaciones.map((v) => v.id.replace('-', '/') + '.json'));
  for (const [archivo, lista] of Object.entries(citas)) {
    assert.ok(ids.has(archivo), `votación inexistente: ${archivo}`);
    for (const c of lista) {
      assert.ok(programas[c.partido], `programa desconocido: ${c.partido}`);
      assert.ok(Number.isInteger(c.pagina) && c.pagina > 0 && c.cita.trim().length > 20, `${archivo}: cita o página no válida`);
    }
  }
});

test('la coincidencia de voto entre grupos es simétrica y coherente', async () => {
  const { default: c } = await import('../src/data/coincidencias.json', { with: { type: 'json' } });
  const m = new Map(c.grupos.flatMap((g) => g.con.map((x) => [`${g.codigo}|${x.codigo}`, x])));
  for (const [clave, x] of m) {
    const [a, b] = clave.split('|');
    const inversa = m.get(`${b}|${a}`);
    assert.deepEqual([x.iguales, x.votaciones], [inversa.iguales, inversa.votaciones], clave);
    assert.ok(x.iguales <= x.votaciones && x.votaciones <= c.total, clave);
    assert.equal(x.porcentaje, Math.round((x.iguales / x.votaciones) * 1000) / 10, clave);
  }
});

test('cada decreto ley tiene su resultado oficial en el BOE', async () => {
  const { default: decretos } = await import('../src/data/decretos.json', { with: { type: 'json' } });
  assert.ok(decretos.length > 0);
  for (const d of decretos) {
    assert.ok(['convalidado', 'derogado'].includes(d.resultado), d.nombre);
    assert.match(d.boe, /^https:\/\/www\.boe\.es\/diario_boe\/txt\.php\?id=BOE-A-\d{4}-\d+$/, d.nombre);
  }
  assert.equal(new Set(decretos.map((d) => d.nombre)).size, decretos.length, 'decretos repetidos');
});

test('no falta ningún decreto ley de 2026: entre votados y pendientes, la numeración es continua', async () => {
  const { default: decretos } = await import('../src/data/decretos.json', { with: { type: 'json' } });
  const { default: pendientes } = await import('../src/data/decretos-pendientes.json', { with: { type: 'json' } });
  const numeros = new Set(
    [...decretos, ...pendientes].map((d) => d.nombre.match(/^Real Decreto-ley (\d+)\/2026$/)?.[1]).filter(Boolean).map(Number),
  );
  const max = Math.max(...numeros);
  const faltan = Array.from({ length: max }, (_, i) => i + 1).filter((n) => !numeros.has(n));
  assert.deepEqual(faltan, [], `Faltan los Reales Decretos-ley ${faltan.join(', ')}/2026`);
});

test('la fecha de revisión de los datos es válida y no está en el futuro', async () => {
  const { default: r } = await import('../src/data/revision.json', { with: { type: 'json' } });
  assert.match(r.fecha, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(new Date(r.fecha + 'T00:00:00Z') <= new Date(), 'fecha de revisión futura');
});
