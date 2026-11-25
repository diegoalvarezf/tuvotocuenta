// Registro único de fuentes. Todo dato que se muestra en la web cita una de estas.
export interface Fuente {
  nombre: string;
  url: string;
}

export const FUENTES = {
  resultados2023: {
    // Fichero usado: Congreso, julio 2023, "Totales" (02202307_TOTA.zip)
    nombre: 'Ministerio del Interior, resultados oficiales del Congreso 2023',
    url: 'https://infoelectoral.interior.gob.es/es/elecciones-celebradas/area-de-descargas/',
  },
  resultadosSenado2023: {
    // Fichero usado: Senado, julio 2023, "Totales" (03202307_TOTA.zip)
    nombre: 'Ministerio del Interior, resultados oficiales del Senado 2023',
    url: 'https://infoelectoral.interior.gob.es/es/elecciones-celebradas/area-de-descargas/',
  },
  candidaturas2026: {
    nombre: 'Candidaturas proclamadas por las Juntas Electorales Provinciales (BOE, 3-11-2026)',
    url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-23103',
  },
  candidaturas2026correccion: {
    nombre: 'Corrección de errores de las candidaturas proclamadas (BOE, 7-11-2026)',
    url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-23383',
  },
  convocatoria2026: {
    nombre: 'Real Decreto 806/2026, de convocatoria de elecciones (BOE)',
    url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742',
  },
  loreg: {
    nombre: 'Ley Orgánica del Régimen Electoral General (BOE)',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672',
  },
  votacionesCongreso: {
    nombre: 'Congreso de los Diputados, datos abiertos de votaciones (XV legislatura)',
    url: 'https://www.congreso.es/es/opendata/votaciones',
  },
  constitucion: {
    nombre: 'Constitución Española (BOE)',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229',
  },
  reglamentoCongreso: {
    nombre: 'Reglamento del Congreso de los Diputados (BOE)',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1982-5196',
  },
} satisfies Record<string, Fuente>;

export type IdFuente = keyof typeof FUENTES;
