// Busca programas nuevos en las webs oficiales de las formaciones que aún no tienen programa registrado.
// Mira la portada, las secciones con palabras como «programa» o «elecciones» y, si la web es WordPress, su
// biblioteca de PDF. Solo da pistas: cada documento se comprueba a mano antes de registrarlo (skill revisar-programas).
//
// Uso: node scripts/rastrear-programas.mjs [desde=AAAA-MM-DD]

import programas from '../src/data/programas.json' with { type: 'json' };

const desde = process.argv[2] ?? '2026-09-01';
const UA = { 'User-Agent': 'Mozilla/5.0 (tuvotocuenta; datos abiertos)' };
const SECCION = /program|propuest|elecci|generales|29n|eleccions|hauteskunde|compromis/i;
const PDF_BUENO = /2026|29n|generales|generals|xerais|program/i;
const PDF_FUERA = /andaluc|arag|extremad|cyl|castilla|europ|municip|auton[oó]mic|2019|2020|2021|2022|2023|2024|23j/i;

async function get(url) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000), redirect: 'follow' });
    return { estado: r.status, texto: r.ok ? (await r.text()).slice(0, 600000) : '' };
  } catch {
    return { estado: 0, texto: '' };
  }
}
// Enlaces en href y también rutas a PDF sueltas en el HTML o en scripts (NEX las tenía fuera de href)
const enlaces = (base, html) =>
  [...html.matchAll(/href="([^"#]+)"/g), ...html.matchAll(/["'(]([^"'()\s<>]+\.pdf)["')]/gi)]
    .map((m) => { try { return new URL(m[1], base).href; } catch { return null; } })
    .filter(Boolean);

for (const f of programas.filter((x) => !x.programa && x.web)) {
  const portada = await get(f.web);
  if (portada.estado !== 200) {
    console.log(`${f.siglas}: la web responde ${portada.estado || 'sin conexión'}`);
    continue;
  }
  const links = [...new Set(enlaces(f.web, portada.texto))];
  const pdfs = new Set(links.filter((l) => /\.pdf($|\?)/i.test(l)));
  for (const s of links.filter((l) => !/\.pdf/i.test(l) && SECCION.test(l)).slice(0, 8)) {
    for (const l of enlaces(s, (await get(s)).texto)) if (/\.pdf($|\?)/i.test(l)) pdfs.add(l);
  }
  // Biblioteca de WordPress: PDF subidos desde la fecha indicada
  const wp = await get(new URL(`/wp-json/wp/v2/media?per_page=50&mime_type=application/pdf&after=${desde}T00:00:00`, f.web).href);
  try { for (const m of JSON.parse(wp.texto || '[]')) pdfs.add(m.source_url); } catch {}
  const pistas = [...pdfs].filter((u) => PDF_BUENO.test(u) && !PDF_FUERA.test(u));
  const ya = new Set((f.documentos ?? []).map((d) => d.url));
  const nuevas = pistas.filter((u) => !ya.has(u));
  if (nuevas.length) console.log(`${f.siglas} → ${nuevas.slice(0, 6).join(' ')}`);
}
