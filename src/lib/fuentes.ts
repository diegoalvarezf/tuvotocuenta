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
  convocatoria2026: {
    nombre: 'Real Decreto 806/2026, de convocatoria de elecciones (BOE)',
    url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742',
  },
  loreg: {
    nombre: 'Ley Orgánica del Régimen Electoral General (BOE)',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672',
  },
} satisfies Record<string, Fuente>;

export type IdFuente = keyof typeof FUENTES;
