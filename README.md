# tuvotocuenta

Web sencilla y neutral para entender las elecciones generales del 29 de noviembre de 2026.

## Qué ofrece

1. **Tu voto en tu provincia**: cuántos diputados elige, cómo se repartieron en 2023 y un simulador de escaños (ley D'Hondt).
2. **Lo que votaron**: votaciones clave de la XV legislatura explicadas en una frase y qué votó cada partido.
3. **Lo que proponen**: comparador por temas con enlace a la página exacta de cada programa, más un test de afinidad.

## Principios

- Simple y limpio.
- Neutral: todo con fuente oficial o cita literal.
- Datos abiertos: Congreso, Ministerio del Interior, BOE.

## Cómo se generan los datos

Todos los datos salen de fuentes oficiales mediante scripts en `scripts/`. Las descargas en bruto se guardan en una carpeta caché fuera del repositorio.

| Dato | Script | Fuente |
|---|---|---|
| Resultados 2023 por provincia | `infoelectoral-congreso.mjs` | Ministerio del Interior (infoelectoral, fichero `02202307_TOTA.zip`) |
| Escaños 2026 por provincia | `boe-escanos.mjs` | Real Decreto 806/2026 (BOE-A-2026-20742) |
| Todas las votaciones del Pleno (XV) | `congreso-votaciones.mjs` | Datos abiertos del Congreso |
| Votaciones destacadas | `votaciones-destacadas.mjs` + `src/data/votaciones-seleccion.json` | Datos abiertos del Congreso |
| PDF y CSV con todas las votaciones | `votaciones-descarga.mjs` | Datos abiertos del Congreso |
| Texto de un programa por página | `programa-paginas.mjs` | PDF oficial del partido |
| Resultados del 29 de noviembre | `resultados-2026.mjs` | Ministerio del Interior (avance de la noche electoral y escrutinio) |
| Icono de la web (favicon) | `favicon.mjs` | Tipografía de la propia web |
| Imágenes para compartir (Open Graph) | `og.mjs` | Datos de la propia web |
| Propuestas de un programa | `programa-extraer.mjs` (Claude + verificación de citas) | PDF oficial del partido |

```bash
CACHE=/ruta/a/cache/congreso
node scripts/congreso-votaciones.mjs $CACHE
node scripts/votaciones-destacadas.mjs $CACHE
node scripts/votaciones-descarga.mjs $CACHE
```

Los scripts comprueban los datos al generarlos (350 escaños, sumas de votos por grupo iguales al total oficial) y fallan si algo no cuadra.

### Programas electorales

```bash
node scripts/programa-paginas.mjs programa.pdf paginas.json
node --env-file=.env scripts/programa-extraer.mjs paginas.json PSOE propuestas-psoe.json
```

`programa-extraer.mjs` descarta cualquier propuesta cuya cita no aparezca literalmente en la página indicada del PDF. Las propuestas se guardan con `revisada: false` y la web solo publica las que una persona ha marcado como `revisada: true` tras comprobarlas.

## Licencia

Código bajo licencia [MIT](LICENSE). Los datos proceden de fuentes oficiales públicas (Ministerio del Interior, Congreso de los Diputados, BOE) y de los programas publicados por cada partido.

### Noche electoral

Cuando haya resultados, convertirlos al formato de `congreso-2023.json` (con `infoelectoral-congreso.mjs` si Interior publica los ficheros habituales, o con un adaptador del avance en directo) y ejecutar:

```bash
node scripts/resultados-2026.mjs provincias-2026.json 99.5 provisional <url-fuente> "Ministerio del Interior, avance de resultados"
```

El script comprueba que los escaños de cada provincia coinciden con el Real Decreto 806/2026. Al existir `src/data/congreso-2026.json`, cada provincia muestra el resultado comparado con 2023, y los tests verifican que el reparto cuadra con la ley D'Hondt.
