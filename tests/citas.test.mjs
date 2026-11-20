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

test('acepta una cita que cruza una cabecera y un pie repetidos en todas las páginas', () => {
  const cab = 'M+J Programa electoral · Elecciones Generales 29N 2026';
  const pie = 'Por un Mundo Más Justo\n\n↑ Volver al índice';
  const pdf = crearVerificador(
    [1, 2, 3, 4, 5, 6].map((n) => ({ pagina: n, texto: `${cab}\n\n${n === 3 ? 'Ampliar el parque social' : n === 4 ? 'hasta el 5% en 2030.' : 'Texto.'}\n\n${pie}\n\n${n}` })),
  );
  assert.ok(pdf({ cita: 'Ampliar el parque social hasta el 5% en 2030.', pagina: 3 }));
});

test('acepta una cita que cruza una cabecera de palabras cortas y una palabra partida entre páginas', () => {
  const pdf = crearVerificador(
    [1, 2, 3, 4, 5, 6].map((n) => ({ pagina: n, texto: `DEFIENDE\nCANARIAS\n\n${n === 3 ? 'Buscaremos el consen-' : n === 4 ? 'so entre islas.' : 'Texto.'}` })),
  );
  assert.ok(pdf({ cita: 'Buscaremos el consenso entre islas.', pagina: 3 }));
});

test('acepta una palabra compuesta con guion partida a final de línea', () => {
  const pdf = crearVerificador([{ pagina: 1, texto: 'Sin colaboración público-\nprivada en la sanidad.' }]);
  assert.ok(pdf({ cita: 'Sin colaboración público-privada en la sanidad.', pagina: 1 }));
});

test('acepta una cita que sigue en la página siguiente aunque esta empiece por su número', () => {
  const pdf = crearVerificador([
    { pagina: 41, texto: '41\n\nAseguraremos que mantengan su poder adquisitivo y suban' },
    { pagina: 42, texto: '42\n\ncon el IPC.' },
  ]);
  assert.ok(pdf({ cita: 'Aseguraremos que mantengan su poder adquisitivo y suban con el IPC.', pagina: 41 }));
});

test('acepta una cita que cruza unas comillas decorativas al final de página y un rango de años partido', () => {
  const pdf = crearVerificador([
    { pagina: 1, texto: 'Defenderemos el marco 2028-\n2034 y bajaremos\n\n‘‘' },
    { pagina: 2, texto: 'los impuestos.' },
  ]);
  assert.ok(pdf({ cita: 'Defenderemos el marco 2028-2034 y bajaremos los impuestos.', pagina: 1 }));
});

test('acepta una cita que cruza viñetas «●» con espacios de ancho cero y un guion de corte con espacio', () => {
  const pdf = crearVerificador([{ pagina: 1, texto: 'Reparto del sector:\n●\u200B Primario 8%.\n●\u200B Industria 47%.\nSegún sus necesidadesy priorizando a los nacionales.' }]);
  assert.ok(pdf({ cita: 'Reparto del sector: Primario 8%. Industria 47%.', pagina: 1 }));
  assert.ok(pdf({ cita: 'Según sus necesidades- y priorizando a los nacionales.', pagina: 1 }));
});

test('acepta guion largo a final de línea y quita marcas sueltas de dos cifras', () => {
  const pdf = crearVerificador([{ pagina: 1, texto: 'Tren Almería–\nAguadulce y una beca de\n02\n22.000 € al año.' }]);
  assert.ok(pdf({ cita: 'Tren Almería–Aguadulce y una beca de 22.000 € al año.', pagina: 1 }));
});

test('con trozos, cada parte (título y descripción) debe estar entera en la página', () => {
  const pdf = crearVerificador([{ pagina: 1, texto: 'Derogar la ley mordaza\nOtra columna.\nCon anulación de las sanciones impuestas.' }]);
  assert.ok(pdf({ cita: 'Derogar la ley mordaza · Con anulación de las sanciones impuestas.', pagina: 1, trozos: true }));
  assert.equal(pdf({ cita: 'Derogar la ley mordaza · Con anulación de todas las sanciones.', pagina: 1, trozos: true }), false);
});

test('acepta el guion largo de un inciso y quita cabecera y pie en documentos de pocas páginas', () => {
  const pdf = crearVerificador([
    { pagina: 1, texto: 'PORTADA' },
    { pagina: 2, texto: 'CIENCIA\nSalvo las que participan–\nexcepto si cruzan de página y\nwww.democracia21.es' },
    { pagina: 3, texto: 'CIENCIA\nsiguen aquí.\nwww.democracia21.es' },
  ]);
  assert.ok(pdf({ cita: 'Salvo las que participan– excepto si cruzan de página y siguen aquí.', pagina: 2 }));
});

test('en trozos, un título partido en dos líneas se reconstruye', () => {
  const pdf = crearVerificador([{ pagina: 1, texto: 'estatal de servicios sociales\n211 Ley\nMínimos comunes en todo el Estado.' }]);
  assert.ok(pdf({ cita: 'Ley estatal de servicios sociales · Mínimos comunes en todo el Estado.', pagina: 1, trozos: true }));
  assert.equal(pdf({ cita: 'Ley autonómica de servicios sociales · Mínimos comunes en todo el Estado.', pagina: 1, trozos: true }), false);
});

test('usa también el texto maquetado y quita el pie «PÁG. N»', () => {
  const pdf = crearVerificador([
    { pagina: 1, texto: 'Eliminar   cupos   los\nde empleo', textoMaquetado: 'Eliminar los cupos de empleo\nreservados y\n\nPÁG. 1' },
    { pagina: 2, texto: 'otra cosa', textoMaquetado: 'sigue aquí.' },
  ]);
  assert.ok(pdf({ cita: 'Eliminar los cupos de empleo reservados y sigue aquí.', pagina: 1 }));
  assert.equal(pdf({ cita: 'Eliminar los cupos de empleo privado.', pagina: 1 }), false);
});

test('quita el número de página y el título del capítulo en mayúsculas al principio de la página', () => {
  const pdf = crearVerificador([
    { pagina: 1, texto: 'Garantizaremos el carácter' },
    { pagina: 2, texto: '22\n\nACABAR CON LA ESPECULACIÓN\n\ninembargable del parque público.' },
  ]);
  assert.ok(pdf({ cita: 'Garantizaremos el carácter inembargable del parque público.', pagina: 1 }));
});

test('acepta una lista con viñetas «»»', () => {
  const pdf = crearVerificador([{ pagina: 1, texto: 'Nuevas competencias plenas:\n» migración\n» puertos y aeropuertos' }]);
  assert.ok(pdf({ cita: 'Nuevas competencias plenas: migración puertos y aeropuertos', pagina: 1 }));
});

test('acepta una frase partida por la maquetación en dos tramos de 3 o más palabras', () => {
  const pdf = crearVerificador([{ pagina: 1, texto: '5.3. Blindar el parc públic\nAltres coses del capítol.\nd’habitatge de titularitat estatal.' }]);
  assert.ok(pdf({ cita: 'Blindar el parc públic d’habitatge de titularitat estatal.', pagina: 1 }));
  assert.equal(pdf({ cita: 'Blindar el parc privat d’habitatge de titularitat estatal.', pagina: 1 }), false);
});

test('une la barra de género a final de línea', () => {
  const pdf = crearVerificador([{ pagina: 1, texto: 'Ayudas a los ganaderos/\nas del territorio.' }]);
  assert.ok(pdf({ cita: 'Ayudas a los ganaderos/as del territorio.', pagina: 1 }));
});

test('quita cabeceras con número de página variable y números de lista sueltos', () => {
  const pdf = crearVerificador(
    [1, 2, 3, 4, 5, 6].map((n) => ({ pagina: n, texto: `${n} Eleccions al Congrés 2026 | Programa electoral\n${n === 3 ? '14.\nMillorar la qualitat edu-' : n === 4 ? '15.\ncativa de tots.' : 'Text.'}` })),
  );
  assert.ok(pdf({ cita: 'Millorar la qualitat educativa de tots.', pagina: 3 }));
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

test('acepta una fila de tabla si cada celda está en la página, aunque salgan sueltas', () => {
  const pdf = crearVerificador([{ pagina: 1, texto: 'QUÉ\n\nHOY\n\nPeso de la Atención Primaria\n\n13,9 %\n\nen el gasto sanitario público\n\nMETA\n\n20 % en 2028 · 25 % en 2030\n\n2030' }]);
  assert.ok(pdf({ cita: 'Peso de la Atención Primaria en el gasto sanitario público · 20 % en 2028 · 25 % en 2030 · 2030', pagina: 1, tabla: true }));
  assert.equal(pdf({ cita: 'Peso de la Atención Primaria en el gasto sanitario público · 30 % en 2028 · 2030', pagina: 1, tabla: true }), false);
});
