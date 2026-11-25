# tuvotocuenta

Web sencilla y neutral para entender las elecciones generales del 29 de noviembre de 2026: **[tuvotocuenta.es](https://tuvotocuenta.es)**

Proyecto independiente, sin relación con ningún partido, sin publicidad y sin rastreo.

## Qué ofrece

1. **Tu voto en tu provincia.** Cuántos diputados elige cada circunscripción, quién se presenta, cómo se repartieron los escaños en 2023 y un simulador del reparto (ley D'Hondt).
2. **Lo que votaron.** Votaciones clave de la XV legislatura, qué votó cada grupo, los decretos ley y con quién coincidió cada grupo en las 2.175 votaciones del Pleno.
3. **Lo que proponen.** Las propuestas de cada programa, tema a tema, cada una con su cita literal y el enlace a la página exacta del documento.

## Principios

- **Solo fuentes oficiales.** Ministerio del Interior, Congreso de los Diputados, BOE y los programas que publica cada formación.
- **Cada dato, con su fuente.** Si es un cálculo propio, se indica y se citan los datos de origen.
- **Mismo trato para todos.** Los mismos criterios, temas y formato para todas las formaciones.
- **Nada sin cita.** Una propuesta solo se publica si su cita aparece palabra por palabra en el documento y una persona la ha revisado.

## Puesta en marcha

Hace falta Node 24. Para trabajar con programas en PDF, también `pdftotext` (poppler).

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm run build` ejecuta antes los tests: si fallan, no se publica.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/pages/` | Las páginas (Astro, sitio estático) |
| `api/` | Chat de dudas: función de servidor y buscador de propuestas |
| `src/data/` | Los datos publicados, en JSON |
| `src/lib/` | Reparto D'Hondt, registro de fuentes, partidos y provincias |
| `scripts/` | Obtención y procesado de datos desde las fuentes oficiales |
| `programas-texto/` | Texto de cada programa, página a página, para verificar las citas |
| `tests/` | Comprobaciones de los datos (`node:test`, sin dependencias) |

## Tests

Comprueban los datos, no solo el código:

- El reparto D'Hondt reproduce los 350 escaños oficiales de 2023.
- Los votos por grupo de cada votación suman el total oficial.
- No falta ningún decreto ley de 2026: la numeración es continua.
- Las candidaturas coinciden con las proclamadas en el BOE.
- Cada cita publicada aparece literalmente en la página indicada de su programa.

## Cómo se generan los datos

Todos los datos salen de fuentes oficiales mediante los scripts de `scripts/`. Las descargas en bruto se guardan en una carpeta caché fuera del repositorio. Los scripts comprueban lo que generan (350 escaños, sumas de votos iguales al total oficial) y fallan si algo no cuadra.

| Dato | Script | Fuente |
|---|---|---|
| Resultados de 2023 por provincia | `infoelectoral-congreso.mjs` | Ministerio del Interior (infoelectoral) |
| Escaños de 2026 por provincia | `boe-escanos.mjs` | Real Decreto 806/2026 (BOE) |
| Candidaturas proclamadas | `boe-candidaturas.mjs` | BOE-A-2026-23103 |
| Votaciones del Pleno (XV legislatura) | `congreso-votaciones.mjs` | Datos abiertos del Congreso |
| Votaciones destacadas | `votaciones-destacadas.mjs` | Datos abiertos del Congreso |
| Coincidencia de voto entre grupos | `coincidencias.mjs` | Datos abiertos del Congreso |
| Decretos ley y su resultado oficial | `decretos.mjs` | Congreso y acuerdos publicados en el BOE |
| PDF y CSV con todas las votaciones | `votaciones-descarga.mjs` | Datos abiertos del Congreso |
| Programas nuevos en las webs oficiales | `rastrear-programas.mjs` | Webs de las formaciones |
| Texto de un programa por página | `programa-paginas.mjs`, `programa-web.mjs` | PDF o página web oficial |
| Propuestas de un programa | `programa-extraer.mjs`, `propuestas-incorporar.mjs` | Programa oficial |
| Resultados del 29 de noviembre | `resultados-2026.mjs` | Ministerio del Interior |
| Icono e imágenes para compartir | `favicon.mjs`, `og.mjs` | La propia web |

Ejemplo, votaciones del Congreso:

```bash
CACHE=/ruta/a/cache/congreso
node scripts/congreso-votaciones.mjs $CACHE
node scripts/votaciones-destacadas.mjs $CACHE
node scripts/votaciones-descarga.mjs $CACHE
```

### Programas electorales

```bash
node scripts/programa-paginas.mjs programa.pdf paginas.json
node --env-file=.env scripts/programa-extraer.mjs paginas.json PSOE borrador.json
node scripts/propuestas-incorporar.mjs paginas.json PSOE borrador.json
```

1. `programa-paginas.mjs` guarda el texto del PDF página a página. Si el programa solo existe como página web, `programa-web.mjs` lo lee de su copia en archive.org, que es la que se enlaza.
2. `programa-extraer.mjs` propone las propuestas con Claude (necesita `ANTHROPIC_API_KEY`): tema, resumen, cita literal y página.
3. `propuestas-incorporar.mjs` descarta toda propuesta cuya cita no aparezca literalmente en su página y añade el resto con `revisada: false`.

La web solo publica las propuestas que una persona ha marcado como `revisada: true` tras comprobarlas. Los criterios de revisión y los errores ya encontrados están en `.claude/skills/revisar-programas/`.

### Noche electoral

Cuando haya resultados, se convierten al formato de `congreso-2023.json` y se ejecuta:

```bash
node scripts/resultados-2026.mjs provincias-2026.json 99.5 provisional <url-fuente> "Ministerio del Interior, avance de resultados"
```

El script comprueba que los escaños de cada provincia coinciden con el Real Decreto 806/2026. Al existir `src/data/congreso-2026.json`, cada provincia muestra el resultado comparado con 2023 y los tests verifican que el reparto cuadra con la ley D'Hondt.

## Chat de dudas

`/preguntar` responde preguntas sobre las propuestas. Es el único código que se ejecuta en el servidor (`api/chat.js`, función de Vercel):

- El modelo no responde de memoria: solo puede llamar al buscador de `api/_buscar.js`, que lee las propuestas publicadas.
- Cada afirmación lleva una referencia a una propuesta, y la página muestra debajo su cita literal y el enlace a su página.
- No recomienda el voto ni valora las propuestas.
- Necesita la variable de entorno `ANTHROPIC_API_KEY`. Sin ella el chat está apagado y la página no se enlaza (`CHAT_ACTIVO` en `src/lib/chat.ts`).

## Avisar de un error

Escribe a contacto@tuvotocuenta.es con el enlace a la página y lo que está mal, o abre una incidencia en este repositorio. Las correcciones se anotan en [Sobre el proyecto](https://tuvotocuenta.es/sobre).

## Licencia

Código bajo licencia [MIT](LICENSE). Los datos proceden de fuentes oficiales públicas y de los programas publicados por cada formación.
