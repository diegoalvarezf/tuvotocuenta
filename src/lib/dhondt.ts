// Reparto de escaños del Congreso (art. 163 LOREG):
// solo entran candidaturas con al menos el 3 % de los votos válidos (incluye votos en blanco)
// y los escaños se asignan por cocientes sucesivos (ley D'Hondt).

export const UMBRAL = 0.03;

export interface Voto {
  id: string;
  votos: number;
}

export function repartir(candidaturas: Voto[], escanos: number, votosValidos: number): Map<string, number> {
  const minimo = votosValidos * UMBRAL;
  const resultado = new Map(candidaturas.map((c) => [c.id, 0]));
  const entran = candidaturas.filter((c) => c.votos > 0 && c.votos >= minimo);

  for (let i = 0; i < escanos; i++) {
    let mejor: Voto | undefined;
    let mejorCociente = -1;
    for (const c of entran) {
      const cociente = c.votos / (resultado.get(c.id)! + 1);
      // En empate gana la candidatura con más votos totales (art. 163.1.d LOREG)
      if (cociente > mejorCociente || (cociente === mejorCociente && mejor && c.votos > mejor.votos)) {
        mejor = c;
        mejorCociente = cociente;
      }
    }
    if (!mejor) break;
    resultado.set(mejor.id, resultado.get(mejor.id)! + 1);
  }
  return resultado;
}
