// Extrae el texto de un programa electoral en PDF, página a página, con pdftotext (poppler).
// La página es la del PDF (1 = primera página del archivo), que es la que se enlaza con #page=N.
//
// Uso: node scripts/programa-paginas.mjs <programa.pdf> <salida.json>

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [pdf, salida] = process.argv.slice(2);
if (!pdf || !salida) {
  console.error('Uso: node scripts/programa-paginas.mjs <programa.pdf> <salida.json>');
  process.exit(1);
}

// pdftotext separa las páginas con un salto de página (\f)
const texto = execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const paginas = texto
  .split('\f')
  .map((t, i) => ({ pagina: i + 1, texto: t.trim() }))
  .filter((p) => p.texto.length > 0);

const total = Number(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/)[1]);
writeFileSync(salida, JSON.stringify({ total, paginas }, null, 1));
console.log(`${paginas.length} páginas con texto de ${total} → ${salida}`);
