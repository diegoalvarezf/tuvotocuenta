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

```bash
CACHE=/ruta/a/cache/congreso
node scripts/congreso-votaciones.mjs $CACHE
node scripts/votaciones-destacadas.mjs $CACHE
node scripts/votaciones-descarga.mjs $CACHE
```

Los scripts comprueban los datos al generarlos (350 escaños, sumas de votos por grupo iguales al total oficial) y fallan si algo no cuadra.
