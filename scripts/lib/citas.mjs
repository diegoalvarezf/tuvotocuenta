// Comprobación de citas de programas: una cita solo es válida si aparece literalmente
// en la página indicada del PDF (o empieza en ella y sigue en la siguiente).

// Normaliza para comparar: codificación de tildes (NFC), guiones de corte de línea, comillas, espacios y mayúsculas
export const normalizar = (s) =>
  s
    .normalize('NFC')
    // Viñetas «●» y espacios de ancho cero (FE de las JONS): no forman parte del texto citado
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/●/g, ' ')
    // Entre cifras el guion es de rango («2028-» / «2034»), no de corte
    .replace(/(\d)-\s*\n\s*(\d)/g, '$1-$2')
    .replace(/-\s*\n\s*/g, '')
    .replace(/[“”«»"]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Devuelve una función que verifica { cita, pagina } contra las páginas del programa
export function crearVerificador(paginas) {
  // Si el texto trae también la versión maquetada (pdftotext -layout), una cita vale si está en cualquiera de las dos
  if (paginas.some((p) => p.textoMaquetado)) {
    const normal = crearVerificador(paginas.map(({ textoMaquetado, ...p }) => p));
    const maquetado = crearVerificador(paginas.map((p) => ({ pagina: p.pagina, texto: p.textoMaquetado ?? p.texto })));
    return (c) => normal(c) || maquetado(c);
  }
  // El pie (número de página, a veces tras el título de la sección en mayúsculas: «VIVENDA · 20»)
  // cortaría las citas que siguen en la página siguiente
  // Igual el número solo en la primera línea («42» en el PP) y unas comillas decorativas al final («‘‘»)
  const sinPie = (t) =>
    t
      .replace(/\n\s*[‘’“”"'«»]+\s*$/, '')
      // Pie «PÁG. 23» (PFAC), al final o en mitad de la página
      .replace(/^\s*PÁG\.\s*\d{1,3}\s*$/gm, '')
      .replace(/\n[^\na-záéíóúàèìòùñç]*·\s*\d{1,3}\s*$/, '')
      .replace(/\s+\d{1,3}\s*$/, '')
      // Número de página al principio, a veces seguido del título del capítulo en mayúsculas (Frente Amplio: «22» / «ACABAR CON…»)
      .replace(/^\s*\d{1,3}\s*\n(\s*\n)*\s*[^\na-záéíóúàèìòùñç]{8,}\n/, '')
      .replace(/^\s*\d{1,3}\s*\n/, '');
  // Cabeceras y pies repetidos («M+J Programa electoral · …», «↑ Volver al índice») también cortarían
  // las citas: se quitan las líneas que aparecen en al menos un cuarto de las páginas (y en 5 o más).
  // Se respetan las que no tienen una palabra (viñetas «•»), pero no las cortas («DEFIENDE» / «CANARIAS»)
  const veces = new Map();
  for (const p of paginas) for (const l of new Set(p.texto.split('\n').map((x) => x.trim()).filter(Boolean))) veces.set(l, (veces.get(l) ?? 0) + 1);
  // En documentos cortos (las partes de 3 a 5 páginas del programa de D21) basta con que se repita en casi todas
  // Un cuarto, no un tercio: hay cabeceras que alternan entre páginas pares e impares (Frente Amplio, 48 de 148)
  const minimo = Math.min(Math.max(5, paginas.length / 4), Math.max(2, paginas.length - 1));
  const sinRepetidas = (t) => t.split('\n').filter((l) => !/\p{L}{3}/u.test(l) || (veces.get(l.trim()) ?? 0) < minimo).join('\n');
  const base = new Map(paginas.map((p) => [p.pagina, sinPie(sinRepetidas(p.texto))]));
  // Marcas sueltas de una a tres cifras en mitad de la página (número de área en Adelante Andalucía: «02»; de compromiso en el PSOE: «136»)
  // cortarían las citas; en las tablas se mantienen, porque pueden ser celdas
  const limpio = new Map([...base].map(([n, t]) => [n, t.replace(/\n\s*\d{1,3}\s*(?=\n)/g, '')]));
  const textoPagina = new Map([...limpio].map(([n, t]) => [n, normalizar(t)]));
  const textoTabla = new Map([...base].map(([n, t]) => [n, normalizar(t)]));
  // En una fila de tabla («Qué · Meta · Plazo») las celdas salen sueltas en el texto del PDF:
  // cada celda tiene que estar en la página, entera o en hasta tres trozos (celdas de varias líneas)
  // con palabras completas: «30» no vale por estar dentro de «2030»
  const contiene = (texto, trozo) =>
    new RegExp(`(?<![\\p{L}\\p{N}])${trozo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(texto);
  const enTrozos = (celda, texto, quedan = 3) => {
    if (contiene(texto, celda)) return true;
    if (quedan === 1) return false;
    // también se parte tras un guion de rango: «2026–2030» puede salir como «2026–» y «2030»
    const palabras = celda.split(/ |(?<=–)(?=\S)/);
    // Al recomponer, tras un guion de rango no va espacio («Huelva–Sevilla»)
    const unir = (ps) => ps.reduce((acc, w) => (acc === '' ? w : acc.endsWith('–') ? acc + w : `${acc} ${w}`), '');
    for (let i = 1; i < palabras.length; i++) {
      const inicio = unir(palabras.slice(0, i));
      if (contiene(texto, inicio) && enTrozos(unir(palabras.slice(i)), texto, quedan - 1)) return true;
    }
    return false;
  };
  // Fuera de las tablas, el guion largo se compara sin espacios alrededor: así valen el nombre compuesto partido
  // a final de línea («Almería–» / «Aguadulce») y el inciso («participan– excepto»)
  const sinEspacioGuion = (t) => t.replace(/\s*–\s*/g, '–');
  return ({ cita, pagina, tabla, trozos }) => {
    const buscada = tabla ? normalizar(cita) : sinEspacioGuion(normalizar(cita));
    const aqui = sinEspacioGuion(textoPagina.get(pagina) ?? '');
    if (tabla) return buscada.length > 0 && buscada.split(' · ').every((celda) => celda.length > 0 && enTrozos(celda, textoTabla.get(pagina) ?? ''));
    // Se unen antes de normalizar para que una palabra partida entre páginas («consen-» / «so») se junte
    const conSiguiente = sinEspacioGuion(normalizar(`${limpio.get(pagina) ?? ''}\n${limpio.get(pagina + 1) ?? ''}`));
    // pdftotext quita el guion a final de línea en palabras compuestas («público-» / «privada») y en rangos («2028-» / «2034»)
    const entera = (texto) => {
      const sinGuion = texto.replace(/([\p{L}\p{N}])-([\p{L}\p{N}])/gu, '$1$2');
      // Guion de corte seguido de espacio («necesidades- y»), que pdftotext pega sin guion ni espacio
      const sinCorte = texto.replace(/(\p{L})- (\p{L})/gu, '$1$2');
      return texto.length > 0 && [texto, sinGuion, sinCorte].some((b) => aqui.includes(b) || conSiguiente.includes(b));
    };
    // Título y descripción que la maquetación a dos columnas separa: cada trozo, literal y entero, en la página
    // Un trozo (normalmente el título) puede salir a su vez partido en dos líneas separadas, como «estatal de servicios
    // sociales» / «211 Ley»: vale si está entero o en dos fragmentos de palabras completas en la página
    if (trozos) return buscada.includes(' · ') && buscada.split(' · ').every((t) => entera(t) || enTrozos(t, aqui, 2));
    return entera(buscada);
  };
}
