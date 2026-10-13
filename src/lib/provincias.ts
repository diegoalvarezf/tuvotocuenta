import resultados2023 from '../data/congreso-2023.json';
import escanos2026 from '../data/escanos-2026.json';
import { UMBRAL } from './dhondt';

export interface Candidatura {
  siglas: string;
  nombre: string;
  grupo: string;
  votos: number;
  escanos: number;
}

export interface Provincia {
  id: string;
  slug: string;
  nombre: string;
  escanos2026: number;
  escanos2023: number;
  censo: number;
  votantes: number;
  votosValidos: number;
  candidaturas: Candidatura[];
}

// Provincias con nombre oficial bilingüe: URL con el nombre más buscado
const SLUGS: Record<string, string> = { '01': 'alava', '03': 'alicante', '07': 'baleares', '12': 'castellon', '46': 'valencia' };

function slug(id: string, nombre: string): string {
  return (
    SLUGS[id] ??
    nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z]+/g, '-')
      .replace(/^-|-$/g, '')
  );
}

export const provincias: Provincia[] = resultados2023.map((p) => {
  const e2026 = escanos2026.find((e) => e.id === p.id);
  if (!e2026) throw new Error(`Sin escaños 2026 para ${p.nombre}`);
  return {
    id: p.id,
    slug: slug(p.id, p.nombre),
    nombre: p.nombre,
    escanos2026: e2026.escanos,
    escanos2023: p.escanos,
    censo: p.censo,
    votantes: p.votantes,
    votosValidos: p.votosValidos,
    candidaturas: p.candidaturas,
  };
});

export interface UltimoEscano {
  ganador: Candidatura;
  // Candidatura que más cerca se quedó de quitárselo y votos que le faltaron
  aspirante: Candidatura;
  faltaron: number;
}

// Quién se llevó el último escaño y qué candidatura se quedó más cerca de arrebatárselo
export function ultimoEscano(p: Provincia): UltimoEscano | null {
  const minimo = Math.ceil(p.votosValidos * UMBRAL);
  const con = p.candidaturas.filter((c) => c.escanos > 0);
  if (con.length === 0) return null;
  // El último escaño es el del cociente ganador más bajo
  const ganador = con.reduce((a, b) => (b.votos / b.escanos < a.votos / a.escanos ? b : a));
  const cociente = ganador.votos / ganador.escanos;

  let mejor: UltimoEscano | null = null;
  for (const c of p.candidaturas) {
    if (c === ganador || c.votos === 0) continue;
    // Votos para que su siguiente cociente supere al último ganador, y llegar al 3 %
    const necesarios = Math.max(Math.floor(cociente * (c.escanos + 1)) + 1, minimo);
    const faltaron = necesarios - c.votos;
    if (!mejor || faltaron < mejor.faltaron) mejor = { ganador, aspirante: c, faltaron };
  }
  return mejor;
}
