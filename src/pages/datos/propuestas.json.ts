// Propuestas en un archivo aparte: la página /propuestas solo lleva las que se ven al entrar
// y el resto se pide al elegir otro tema. Así la página pesa poco y responde enseguida en el móvil.
import programas from '../../data/programas.json';
import propuestasJson from '../../data/propuestas.json';

interface Propuesta {
  partido: string;
  tema: string;
  resumen: string;
  cita: string;
  pagina: number;
  concreta: boolean;
  revisada: boolean;
  tabla?: boolean;
  // Título y descripción separados por la maquetación: se citan como trozos literales unidos por « · »
  trozos?: boolean;
  // Parte del programa, si se publica en varios documentos (D21)
  documento?: string;
}

export function GET() {
  // Igual que en la página: solo las revisadas (en local, también los borradores)
  const propuestas = (propuestasJson as Propuesta[]).filter((p) => p.revisada || import.meta.env.DEV);
  // Documento del que sale cada propuesta: el programa o, si no lo llama así, su documento principal
  const documentos = Object.fromEntries(
    programas.map((p) => [p.siglas, ((p.programa as { url: string } | null) ?? (p.documentos as { url: string }[])[0])?.url ?? '']),
  );
  const datos = {
    documentos,
    // Por formación y página: [partido, tema, resumen, cita, página, concreta, tabla (1) o trozos (2), revisada, documento si es una parte]
    propuestas: [...propuestas]
      .sort((a, b) => a.pagina - b.pagina)
      .map((p) => [p.partido, p.tema, p.resumen, p.cita, p.pagina, p.concreta ? 1 : 0, p.tabla ? 1 : p.trozos ? 2 : 0, p.revisada ? 1 : 0, ...(p.documento ? [p.documento] : [])]),
  };
  return new Response(JSON.stringify(datos), { headers: { 'Content-Type': 'application/json' } });
}
