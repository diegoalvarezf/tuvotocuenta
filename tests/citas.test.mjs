// Ninguna cita de un programa puede publicarse si no está literalmente en su página
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearVerificador } from '../scripts/lib/citas.mjs';
import programas from '../src/data/programas.json' with { type: 'json' };
import propuestas from '../src/data/propuestas.json' with { type: 'json' };
import TEMAS from '../src/data/temas.json' with { type: 'json' };

const paginas = [
  { pagina: 1, texto: 'Introducción del programa.' },
  { pagina: 2, texto: 'Aceleraremos la creación de nuevas plazas públicas en escuelas\ninfantiles hasta alcanzar una cober-\ntura del 90%. Además,' },
  { pagina: 3, texto: 'reduciremos las listas de espera a 30 días.' },
];
const verificar = crearVerificador(paginas);

test('acepta una cita literal, aunque cruce saltos de línea o guiones de corte', () => {
  assert.ok(verificar({ cita: 'nuevas plazas públicas en escuelas infantiles hasta alcanzar una cobertura del 90%', pagina: 2 }));
});

test('acepta una cita que empieza en una página y sigue en la siguiente', () => {
  assert.ok(verificar({ cita: 'Además, reduciremos las listas de espera', pagina: 2 }));
});

test('acepta una cita que sigue en la página siguiente aunque el pie lleve el título de la sección', () => {
  const pdf = crearVerificador([
    { pagina: 1, texto: 'Revalorización das pensións\nconforme ao IPC real e\n\nDEREITO A UNHA VIDA DIGNA · 20' },
    { pagina: 2, texto: 'suba das mínimas.' },
  ]);
  assert.ok(pdf({ cita: 'conforme ao IPC real e suba das mínimas', pagina: 1 }));
});

test('rechaza una cita con un dato cambiado', () => {
  assert.equal(verificar({ cita: 'hasta alcanzar una cobertura del 95%', pagina: 2 }), false);
});

test('rechaza una cita atribuida a otra página', () => {
  // La página 3 no la contiene, ni tampoco la siguiente
  assert.equal(verificar({ cita: 'hasta alcanzar una cobertura del 90%', pagina: 3 }), false);
});

test('acepta una cita aunque el PDF codifique las tildes de otra forma (a + tilde combinada)', () => {
  const pdf = crearVerificador([{ pagina: 1, texto: 'Se avanza\u0301 en la eliminacio\u0301n del copago.' }]);
  assert.ok(pdf({ cita: 'Se avanzá en la eliminación del copago.', pagina: 1 }));
});

test('rechaza una cita vacía', () => {
  assert.equal(verificar({ cita: '  ', pagina: 2 }), false);
});

test('las propuestas publicadas son de partidos con documento y de temas válidos', () => {
  for (const p of propuestas.filter((x) => x.revisada)) {
    const partido = programas.find((x) => x.siglas === p.partido);
    assert.ok(partido?.programa ?? partido?.documentos?.[0], `${p.partido} no tiene documento`);
    assert.ok(TEMAS.includes(p.tema), `tema desconocido: ${p.tema}`);
  }
});
