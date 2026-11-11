// Comprobación de citas de programas: una cita solo es válida si aparece literalmente
// en la página indicada del PDF (o empieza en ella y sigue en la siguiente).

// Normaliza para comparar: codificación de tildes (NFC), guiones de corte de línea, comillas, espacios y mayúsculas
export const normalizar = (s) =>
  s
    .normalize('NFC')
    .replace(/-\s*\n\s*/g, '')
    .replace(/[“”«»"]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Devuelve una función que verifica { cita, pagina } contra las páginas del programa
export function crearVerificador(paginas) {
  // El pie (número de página, a veces tras el título de la sección en mayúsculas: «VIVENDA · 20»)
  // cortaría las citas que siguen en la página siguiente
  // Igual el número solo en la primera línea («42» en el PP)
  const sinPie = (t) => t.replace(/\n[^\na-záéíóúàèìòùñç]*·\s*\d{1,3}\s*$/, '').replace(/\s+\d{1,3}\s*$/, '').replace(/^\s*\d{1,3}\s*\n/, '');
  // Cabeceras y pies repetidos («M+J Programa electoral · …», «↑ Volver al índice») también cortarían
  // las citas: se quitan las líneas que aparecen en al menos un tercio de las páginas (y en 5 o más).
  // Se respetan las que no tienen una palabra (viñetas «•»), pero no las cortas («DEFIENDE» / «CANARIAS»)
  const veces = new Map();
  for (const p of paginas) for (const l of new Set(p.texto.split('\n').map((x) => x.trim()).filter(Boolean))) veces.set(l, (veces.get(l) ?? 0) + 1);
  const minimo = Math.max(5, paginas.length / 3);
  const sinRepetidas = (t) => t.split('\n').filter((l) => !/\p{L}{3}/u.test(l) || (veces.get(l.trim()) ?? 0) < minimo).join('\n');
  const limpio = new Map(paginas.map((p) => [p.pagina, sinPie(sinRepetidas(p.texto))]));
  const textoPagina = new Map([...limpio].map(([n, t]) => [n, normalizar(t)]));
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
    for (let i = 1; i < palabras.length; i++) {
      const inicio = palabras.slice(0, i).join(' ');
      if (contiene(texto, inicio) && enTrozos(palabras.slice(i).join(' '), texto, quedan - 1)) return true;
    }
    return false;
  };
  return ({ cita, pagina, tabla }) => {
    const buscada = normalizar(cita);
    const aqui = textoPagina.get(pagina) ?? '';
    if (tabla) return buscada.length > 0 && buscada.split(' · ').every((celda) => celda.length > 0 && enTrozos(celda, aqui));
    // Se unen antes de normalizar para que una palabra partida entre páginas («consen-» / «so») se junte
    const conSiguiente = normalizar(`${limpio.get(pagina) ?? ''}\n${limpio.get(pagina + 1) ?? ''}`);
    // El guion de una palabra compuesta a final de línea («público-» / «privada») se pierde al unir los cortes
    const sinGuion = buscada.replace(/(\p{L})-(\p{L})/gu, '$1$2');
    return buscada.length > 0 && [buscada, sinGuion].some((b) => aqui.includes(b) || conSiguiente.includes(b));
  };
}
