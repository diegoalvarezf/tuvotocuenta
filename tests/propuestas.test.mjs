import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import propuestas from '../src/data/propuestas.json' with { type: 'json' };
import programas from '../src/data/programas.json' with { type: 'json' };
import TEMAS from '../src/data/temas.json' with { type: 'json' };
import { crearVerificador } from '../scripts/lib/citas.mjs';

// Texto de cada documento, generado con scripts/programa-paginas.mjs
const TEXTOS = { 'Frente Obrero': 'frente-obrero', CNV: 'cnv', IE: 'ie', 'B.N.G.': 'bng', 'Mundo+Justo': 'mundo-mas-justo', CCa: 'cc', PH: 'ph', 'EAJ-PNV': 'pnv', PP: 'pp', VOX: 'vox' };

test('cada formación con propuestas tiene un documento y su texto en el repositorio', () => {
  for (const partido of new Set(propuestas.map((p) => p.partido))) {
    const p = programas.find((x) => x.siglas === partido);
    assert.ok(p?.programa ?? p?.documentos?.[0], `${partido} sin documento`);
    assert.ok(existsSync(`programas-texto/${TEXTOS[partido]}.json`), `${partido} sin texto`);
  }
});

test('cada cita aparece literalmente en su página', () => {
  for (const [partido, archivo] of Object.entries(TEXTOS)) {
    const { paginas } = JSON.parse(readFileSync(`programas-texto/${archivo}.json`, 'utf8'));
    const verificar = crearVerificador(paginas);
    for (const p of propuestas.filter((x) => x.partido === partido)) {
      assert.ok(verificar(p), `${partido}, pág. ${p.pagina}: ${p.cita.slice(0, 80)}`);
    }
  }
});

test('temas válidos, resúmenes breves y sin duplicados', () => {
  const vistos = new Set();
  for (const p of propuestas) {
    assert.ok(TEMAS.includes(p.tema), `tema desconocido: ${p.tema}`);
    assert.ok(p.resumen.split(/\s+/).length < 25, `resumen largo: ${p.resumen}`);
    assert.equal(typeof p.concreta, 'boolean');
    const clave = `${p.partido}|${p.resumen}`;
    assert.ok(!vistos.has(clave), `duplicada: ${clave}`);
    vistos.add(clave);
  }
});
