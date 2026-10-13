# tuvotocuenta

Web neutral y simple para entender las elecciones generales del 29-11-2026. Ver README.md.

## Reglas del proyecto

- Neutralidad: todo dato lleva fuente oficial o cita literal con página. Nunca resumir posturas sin fuente.
- Simple y limpio: poco texto, sin dependencias innecesarias. JS solo donde haga falta interactividad.
- Datos en `src/data/` (JSON). Scripts de obtención/procesado de datos en `scripts/`.
- Textos de la web en español.

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
