---
name: revisar-programas
description: Revisa un programa electoral nuevo y sus propuestas antes de publicarlas en tuvotocuenta. Úsala al añadir un programa, cambiar propuestas o actualizar el recuento de programas.
---

# Revisar programas

Lee antes `lecciones.md`, en esta carpeta: son errores reales que no se pueden repetir. Las reglas valen igual para todas las formaciones; no se valora si una propuesta es buena, viable o constitucional.

## 1. El documento

- Búscalo en la web oficial de la formación, entrando en sus secciones. Las webs de terceros solo sirven de pista. Cruza siempre con la prensa del día: un partido puede presentar su programa sin enlazarlo aún en su portada.
- Léelo: portada, presentación y cómo se define a sí mismo.
- Anota páginas (`pdfinfo`), fecha y si cita estas elecciones.
- Cuenta como programa completo si la formación lo ofrece como su programa electoral y tiene 20 páginas o más. Si no, va en `documentos`, con `aviso` si se define de otra forma.
- Guarda copia en archive.org si es posible y el texto con `scripts/programa-paginas.mjs` en `programas-texto/<partido>.json`.

## 2. Extraer

Con `scripts/programa-extraer.mjs` o, si no hay clave de API, con un agente que siga sus mismas reglas. Incorpora el borrador con `scripts/propuestas-incorporar.mjs`, que descarta lo que no sea literal.

## 3. Revisar una a una

Dos pasadas independientes, leyendo cada cita en su página y su contexto:

- **Propuesta:** un compromiso de hacer algo. Fuera diagnósticos, críticas y valores sin medida, y los duplicados. Lo vago pero real se queda como genérica.
- **Resumen:** dice lo mismo que la cita, sin valorar ni añadir, en menos de 25 palabras.
- **Cita:** literal, frase completa, sin número de lista ni otra medida. Si cruza de página, lleva la página donde empieza.
- **Tema:** uno de `src/data/temas.json`.
- **Concreta:** solo con cifra, fecha, plazo o medida legal o administrativa identificable. «Reforzar», «más ayudas» o «impulsar» son genéricas.
- **Igual trato:** compara el criterio entre formaciones y mira si la tasa de eliminadas o de concretas difiere mucho.

Decide tú lo mecánico, pero no apliques en bloque lo que proponga un agente sin leer sus motivos.

## 4. Publicar

1. `npm test` comprueba cada cita contra el texto y la coherencia de los datos.
2. Prepara una muestra de 15 propuestas por formación, repartidas por tema, para Diego.
3. Solo con su visto bueno marca `revisada: true`.
4. Actualiza `src/data/actualizado.json` con la fecha y hora de la publicación y comprueba que se ve en producción.

## 5. Al terminar

Añade a `lecciones.md` cada error nuevo, tuyo, de un agente o de Diego, como una regla comprobable. Si se puede comprobar con código, añade también un test.
