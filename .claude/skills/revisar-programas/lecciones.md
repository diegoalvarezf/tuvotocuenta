# Lecciones

Errores reales. Cada uno, una regla.

- **Leer cómo se define el documento.** Frente Obrero se contó como programa electoral y su página 6 dice que «no pretende ser un programa electoral». (3-11-2026)
- **No afirmar un «ninguno» sin mirar las webs oficiales.** Publicamos «0 de 48» con webs de terceros; en las oficiales estaban el documento de Vox y 3 programas. (3-11-2026)
- **Comprobar que una descarga está completa.** El sumario del BOE del 28-10 llegó incompleto, sin error, y se dijo que no había candidaturas. Comparar tamaños o usar la API de datos abiertos. (3-11-2026)
- **«Genérica» no es «eliminar».** Una pasada quiso quitar 60 propuestas vagas, entre ellas reducir listas de espera. La web habría dicho «no dice nada sobre este tema», y eso sería falso. (3-11-2026)
- **Una regla de recuento es una decisión.** El corte de 20 páginas se puso sin consultar. Toda regla que cambie lo que se publica se le plantea a Diego, y aparece en los resúmenes. (3-11-2026)
- **Dominios con el nombre del partido no son su web.** frenteamplio.es está aparcado; la web es frenteamplio.info. Confirmar con su aviso legal. (3-11-2026)
- **No enlazar webs dudosas.** soriaya.org tiene enlaces ocultos a casinos. PANCAL-URCI publica un PDF con DNI y cuenta bancaria: enlazar solo la portada. (3-11-2026)
- **Pies de página.** El número de página cortaba citas entre páginas; ahora el verificador lo ignora. (3-11-2026)
- **El pie puede llevar el título de la sección.** En el BNG («VIVENDA · 20») cortaba las citas entre páginas y los agentes recortaron o quitaron propuestas. Ahora el verificador lo ignora; si un pie nuevo rompe citas, se arregla el verificador, no se recortan. (8-11-2026)
- **No perder propuestas por longitud.** La regla de 10 a 60 palabras es una guía: una medida completa más corta se cita tal cual, y una frase larga se cita en un fragmento continuo. (8-11-2026)
- **Tablas de compromisos.** M+J pone sus metas medibles en tablas cuyas celdas salen sueltas en el texto del PDF, y la extracción las dejaba fuera. Se citan como fila «Qué · Meta · Plazo» con `tabla: true`, y el verificador comprueba cada celda con palabras completas. Decidido con Diego. (8-11-2026)
- **Cabeceras y pies de cada PDF.** El verificador quita las líneas repetidas en un tercio o más de las páginas; mirar siempre el principio y el final de algunas páginas antes de extraer. (8-11-2026)
- **Cabeceras de palabras cortas y palabras partidas entre páginas.** En CCa, «DEFIENDE / CANARIAS» no se quitaba por ser corta y «consen-» / «so» no se unía, y se caían 5 citas. Ahora el verificador quita las líneas repetidas que tienen una palabra y une las páginas antes de normalizar. (9-11-2026)
- **Una frase, una cita.** En CCa una frase se partió en dos propuestas y la segunda empezaba en minúscula («apoyo a la…»). Si una frase tiene dos medidas, se cita entera y se resume junta. (9-11-2026)
- **Comprobar los tests antes de subir.** Un `npm test | grep … && git commit` hizo commit con un test fallando, porque grep acertaba con «fail 1». Mirar que diga «fail 0». (9-11-2026)
- **Guion de palabra compuesta a final de línea.** En el PH «público-» / «privada» se unía como «públicoprivada» y la cita literal no pasaba. Ahora el verificador acepta las dos formas; no se cambia la cita. (10-11-2026)
- **No fiarse solo de la portada de cada web.** El 10-11 se dijo que no había más programas y el PP había presentado el suyo ese día, sin enlazarlo en pp.es. En cada revisión, cruzar las webs oficiales con la prensa del día y buscar el documento en la web oficial antes de dar un «no hay». (10-11-2026)
- **Memoria democrática y secretos oficiales van en «Seguridad y justicia».** Estaban repartidos entre Defensa, Otros e Igualdad según el partido. Decidido con Diego: leyes de memoria, lugares y símbolos del franquismo, reparación de sus víctimas, Ley de Secretos Oficiales y desclasificaciones. (11-11-2026)
- **Una medida repetida en dos capítulos se cita una vez.** En el PNV la 5.2-02 repetía la 2.7-05. (11-11-2026)
