// Extrae las propuestas de un programa electoral con Claude y verifica cada cita contra el PDF.
//
// Para cada bloque de páginas, Claude devuelve propuestas con tema, resumen, cita literal y página.
// Después se COMPRUEBA que la cita aparece palabra por palabra en esa página (o la siguiente, por si
// cruza el salto). Las que no aparecen se descartan y se listan para revisión: nunca se publica una cita
// que no esté en el documento original.
//
// Uso: node scripts/programa-extraer.mjs <paginas.json> <partido> <salida.json>
// Requiere ANTHROPIC_API_KEY (por ejemplo en .env: node --env-file=.env scripts/programa-extraer.mjs ...)

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import TEMAS from '../src/data/temas.json' with { type: 'json' };

const [entrada, partido, salida] = process.argv.slice(2);
if (!entrada || !partido || !salida) {
  console.error('Uso: node scripts/programa-extraer.mjs <paginas.json> <partido> <salida.json>');
  process.exit(1);
}


const Propuestas = z.object({
  propuestas: z.array(
    z.object({
      tema: z.enum(TEMAS),
      resumen: z.string().describe('La propuesta en una frase breve, fiel al texto, sin valorarla'),
      cita: z.string().describe('Fragmento copiado literalmente del texto, sin cambiar ni una palabra'),
      pagina: z.number().int().describe('Número de página donde está la cita, según las marcas [PÁGINA N]'),
      concreta: z.boolean().describe('true si incluye una cifra, fecha, plazo o medida verificable'),
    }),
  ),
});

const SISTEMA = `Extraes propuestas de programas electorales para una web neutral que ayuda a la ciudadanía a comparar partidos.

Reglas:
- Una propuesta es un compromiso de hacer algo si gobiernan. No incluyas diagnósticos, críticas a otros partidos ni declaraciones de valores sin medida asociada.
- "cita" debe ser un fragmento COPIADO LITERALMENTE del texto, de 10 a 60 palabras, sin corregir erratas, sin cambiar palabras ni puntuación y sin unir trozos separados. Se comprobará automáticamente contra el PDF y se descartará si no coincide.
- "resumen" describe la propuesta en una frase de menos de 25 palabras, con las palabras del propio partido cuando sea posible. No la valores, no la califiques y no añadas contexto que no esté en el texto.
- "concreta" es true solo si la propuesta tiene una cifra, una fecha, un plazo o una medida que se pueda comprobar. Las intenciones genéricas ("impulsaremos", "apostaremos por") sin nada de eso son false.
- Trata a todos los partidos exactamente igual. Si un bloque no tiene propuestas, devuelve la lista vacía.`;

const client = new Anthropic();
const { paginas } = JSON.parse(readFileSync(entrada, 'utf8'));
const PAGINAS_POR_BLOQUE = 12;

// Normaliza para comparar citas: espacios, guiones de corte de línea, comillas y mayúsculas
const normalizar = (s) =>
  s
    .replace(/-\s*\n\s*/g, '')
    .replace(/[“”«»"]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const textoPagina = new Map(paginas.map((p) => [p.pagina, normalizar(p.texto)]));

function verificar(p) {
  const cita = normalizar(p.cita);
  const aqui = textoPagina.get(p.pagina) ?? '';
  const conSiguiente = `${aqui} ${textoPagina.get(p.pagina + 1) ?? ''}`;
  return aqui.includes(cita) || conSiguiente.includes(cita);
}

const verificadas = [];
const descartadas = [];
let uso = { entrada: 0, salida: 0 };

for (let i = 0; i < paginas.length; i += PAGINAS_POR_BLOQUE) {
  const bloque = paginas.slice(i, i + PAGINAS_POR_BLOQUE);
  const texto = bloque.map((p) => `[PÁGINA ${p.pagina}]\n${p.texto}`).join('\n\n');
  const rango = `${bloque[0].pagina}-${bloque.at(-1).pagina}`;

  const res = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    system: SISTEMA,
    output_config: { effort: 'high', format: zodOutputFormat(Propuestas) },
    messages: [{ role: 'user', content: `Programa electoral de ${partido}, páginas ${rango}:\n\n${texto}` }],
  });
  uso.entrada += res.usage.input_tokens;
  uso.salida += res.usage.output_tokens;

  if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens' || !res.parsed_output) {
    console.warn(`Páginas ${rango}: sin resultado (${res.stop_reason}). Revisar a mano.`);
    descartadas.push({ paginas: rango, motivo: `respuesta incompleta: ${res.stop_reason}` });
    continue;
  }

  for (const p of res.parsed_output.propuestas) {
    if (verificar(p)) verificadas.push({ partido, ...p, revisada: false });
    else descartadas.push({ ...p, motivo: 'la cita no aparece literalmente en esa página' });
  }
  console.log(`Páginas ${rango}: ${res.parsed_output.propuestas.length} propuestas`);
}

writeFileSync(salida, JSON.stringify({ partido, generado: new Date().toISOString(), propuestas: verificadas, descartadas, uso }, null, 2));
console.log(`${verificadas.length} verificadas, ${descartadas.length} descartadas → ${salida}`);
console.log(`Tokens: ${uso.entrada} de entrada, ${uso.salida} de salida`);
