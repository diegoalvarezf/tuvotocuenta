import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import propuestas from '../src/data/propuestas.json' with { type: 'json' };
import programas from '../src/data/programas.json' with { type: 'json' };
import TEMAS from '../src/data/temas.json' with { type: 'json' };
import { crearVerificador } from '../scripts/lib/citas.mjs';

// Texto de cada documento, generado con scripts/programa-paginas.mjs
const TEXTOS = { 'Frente Obrero': 'frente-obrero', CNV: 'cnv', IE: 'ie', 'B.N.G.': 'bng', 'Mundo+Justo': 'mundo-mas-justo', CCa: 'cc', PH: 'ph', 'EAJ-PNV': 'pnv', PP: 'pp', VOX: 'vox', PACMA: 'pacma', 'FE de las JONS': 'fe-jons', D21: 'd21', 'ADELANTE ANDALUCÍA': 'adelante-andalucia', PFAC: 'pfac', PSOE: 'psoe' };

test('cada formación con propuestas tiene un documento y su texto en el repositorio', () => {
  for (const partido of new Set(propuestas.map((p) => p.partido))) {
    const p = programas.find((x) => x.siglas === partido);
    assert.ok(p?.programa ?? p?.documentos?.[0], `${partido} sin documento`);
    // Un programa en varias partes guarda el texto de cada una en una carpeta
    assert.ok(existsSync(`programas-texto/${TEXTOS[partido]}.json`) || existsSync(`programas-texto/${TEXTOS[partido]}`), `${partido} sin texto`);
  }
});

test('cada cita aparece literalmente en su página', () => {
  for (const [partido, archivo] of Object.entries(TEXTOS)) {
    // Programas publicados en varias partes (D21): cada propuesta indica su parte en «documento»
    const partes = programas.find((x) => x.siglas === partido)?.programa?.partes;
    const verificadores = new Map();
    const verificadorDe = (texto) => {
      if (!verificadores.has(texto)) verificadores.set(texto, crearVerificador(JSON.parse(readFileSync(`programas-texto/${texto}.json`, 'utf8')).paginas));
      return verificadores.get(texto);
    };
    for (const p of propuestas.filter((x) => x.partido === partido)) {
      const texto = partes ? partes.find((x) => x.url === p.documento)?.texto : archivo;
      assert.ok(texto, `${partido}: propuesta sin parte del programa (${p.documento})`);
      assert.ok(verificadorDe(texto)(p), `${partido}, ${texto}, pág. ${p.pagina}: ${p.cita.slice(0, 80)}`);
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
