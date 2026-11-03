// Colores aproximados de cada formación, solo para distinguirlas en los gráficos.
// Las federaciones territoriales comparten color con su partido (PSC, PSdeG… → PSOE).
const COLORES: [RegExp, string][] = [
  [/PSOE|PSC/, '#e1251b'],
  [/^PP$/, '#1d6fc4'],
  [/^VOX$/, '#5bb031'],
  [/SUMAR|Frente Amplio/, '#d6336c'],
  [/^ERC/, '#f2a516'],
  [/JUNTS/, '#16b3a6'],
  [/Bildu/, '#a3b818'],
  [/PNV/, '#2f7d3e'],
  [/B\.?N\.?G/, '#6aa9d8'],
  [/^CCa/, '#e9c600'],
  [/U\.?P\.?N/, '#30489a'],
];

export const COLOR_OTROS = '#a3a3a3';

export function color(siglas: string): string {
  return COLORES.find(([re]) => re.test(siglas))?.[1] ?? COLOR_OTROS;
}

// Grupos parlamentarios del Congreso (códigos de los datos abiertos) → color de su partido
const SIGLAS_GRUPO: Record<string, string> = {
  GS: 'PSOE',
  GP: 'PP',
  GVOX: 'VOX',
  GSUMAR: 'SUMAR',
  GR: 'ERC',
  GJxCAT: 'JUNTS',
  'GEH Bildu': 'Bildu',
  'GV (EAJ-PNV)': 'PNV',
};

export function colorGrupo(codigo: string): string {
  return SIGLAS_GRUPO[codigo] ? color(SIGLAS_GRUPO[codigo]) : COLOR_OTROS;
}
