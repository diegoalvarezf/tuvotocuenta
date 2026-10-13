# tuvotocuenta

Web neutral y simple para entender las elecciones generales del 29-11-2026. Ver README.md.

## Reglas del proyecto

- Neutralidad: todo dato lleva fuente oficial o cita literal con página. Nunca resumir posturas sin fuente.
- Simple y limpio: poco texto, sin dependencias innecesarias. JS solo donde haga falta interactividad.
- Datos en `src/data/` (JSON). Scripts de obtención/procesado de datos en `scripts/`.
- Textos de la web en español.

## Diseño

Claro, limpio, moderno y fluido; que no parezca hecho con IA:
- Estilo editorial: Instrument Serif para titulares y cifras grandes, Instrument Sans para el texto. Fondo papel, tinta casi negra.
- Nada de rejillas de tarjetas con iconos, degradados, emojis ni sombras. Separar con líneas finas y espacio.
- El color solo aparece en los datos (partidos). La interfaz es monocroma.
- Transiciones suaves entre páginas (ClientRouter de Astro) y microanimaciones discretas; respetar `prefers-reduced-motion`.
- Mobile first: estilos base para móvil y `min-width` para ampliar en pantallas grandes. Mucha gente la verá desde el móvil.
- Tema claro por defecto (fondo papel) con botón para pasar a oscuro; la elección se guarda en el navegador.
- Cada dato visible lleva su fuente enlazada (componente `Fuente`, registro en `src/lib/fuentes.ts`). Si es un cálculo propio, se indica y se citan los datos de origen.

## Tests

`npm test` (node:test, sin dependencias). Se ejecutan antes de cada build: si fallan, Vercel no publica. Cubren el reparto D'Hondt contra los 350 escaños oficiales de 2023, la coherencia de las votaciones con los totales oficiales y el verificador de citas de programas.

## Stack

Astro + TypeScript estricto, estático, despliegue en Vercel.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
