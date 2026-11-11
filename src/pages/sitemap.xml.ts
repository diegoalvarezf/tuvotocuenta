// Mapa del sitio para los buscadores: todas las páginas públicas, con la fecha del último cambio en la información
import { provincias } from '../lib/provincias';
import actualizacion from '../data/actualizado.json';

const SITIO = 'https://tuvotocuenta.es';

export function GET() {
  const fecha = actualizacion.fecha.slice(0, 10);
  const rutas = ['/', '/tu-voto', '/votaciones', '/propuestas', ...provincias.map((p) => `/tu-voto/${p.slug}`), '/sobre', '/privacidad'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas.map((r) => `  <url><loc>${SITIO}${r}</loc><lastmod>${fecha}</lastmod></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
