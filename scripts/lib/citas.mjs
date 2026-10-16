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
  const textoPagina = new Map(paginas.map((p) => [p.pagina, normalizar(p.texto)]));
  return ({ cita, pagina }) => {
    const buscada = normalizar(cita);
    const aqui = textoPagina.get(pagina) ?? '';
    const conSiguiente = `${aqui} ${textoPagina.get(pagina + 1) ?? ''}`;
    return buscada.length > 0 && (aqui.includes(buscada) || conSiguiente.includes(buscada));
  };
}
