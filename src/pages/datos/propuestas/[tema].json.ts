// Propuestas en archivos aparte, uno por tema: la página /propuestas solo lleva las que se ven al entrar
// y pide el tema que se elige. Así la página y cada descarga pesan poco y responden enseguida en el móvil.
import programas from '../../../data/programas.json';
import propuestasJson from '../../../data/propuestas.json';
import TEMAS from '../../../data/temas.json';

// Nombre del archivo de cada tema: «Seguridad y justicia» → «seguridad-y-justicia»
const slugTema = (t: string) => t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function getStaticPaths() {
  return TEMAS.map((t) => ({ params: { tema: slugTema(t) }, props: { tema: t } }));
}

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

export function GET({ props }: { props: { tema: string } }) {
  // Igual que en la página: solo las revisadas (en local, también los borradores)
  const propuestas = (propuestasJson as Propuesta[]).filter((p) => (p.revisada || import.meta.env.DEV) && p.tema === props.tema);
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
