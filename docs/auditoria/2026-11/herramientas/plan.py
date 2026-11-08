import csv, sys, collections
IDX = '/RUTA/AL/SCRATCH/indice-hallazgos.tsv'
idx = {}
for row in csv.reader(open(IDX, encoding='utf-8'), delimiter='\t'):
    idx[int(row[0][2:])] = dict(sev=row[1], cat=row[2], fase=row[3], title=row[4])
PLAN = [
 ('C01', 'publicacion-y-dependencias', 2, [1, 2, 6, 144]),
 ('C02', 'legal-y-privacidad', 2, [7, 17, 18, 70]),
 ('C03', 'catalogo-vivo', 2, [8, 19, 52, 53, 56, 59, 60, 63, 66]),
 ('C04', 'avisos-de-drop', 2, [20, 54, 61, 64, 174]),
 ('C05', 'resiliencia-y-errores', 2, [9, 39, 58, 103, 116, 154, 155, 156, 157, 159, 162, 163, 175]),
 ('C06', 'puerta-y-politica-de-origen', 2, [11, 148, 149, 150, 151, 158, 164]),
 ('C07', 'carrito-checkout-y-cuenta', 2, [21, 22, 23, 24, 25, 69, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 84]),
 ('C08', 'rocky-ia', 2, [26, 27, 85, 86, 87, 88, 89, 90, 91, 92, 104, 115, 124, 134]),
 ('C09', 'crew', 2, [28, 29, 37, 93, 94, 95, 98, 99, 100, 101, 102, 160, 161]),
 ('C10', 'estudio-de-beats', 2, [30, 31, 32, 33, 34, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 117, 120, 121, 122, 123, 125, 126, 127, 128]),
 ('C11', 'noche-y-musica', 2, [35, 44, 119, 129, 130, 131, 132, 133, 138, 139, 140, 141, 142, 143, 146]),
 ('C12', 'navegacion-y-accesibilidad-global', 2, [10, 13, 14, 15, 16, 40, 41, 42, 45, 46, 48, 49, 50, 51, 55, 57, 65, 67, 173]),
 ('C13', 'identidad-y-sistema-visual', 3, [38, 36, 172, 147, 165, 166, 167, 168]),
 ('C14', 'orden-del-arte', 3, [4, 5]),
 ('C15', 'imagenes-y-medios', 4, [3, 47, 68, 83, 145, 169]),
 ('C16', 'carga-y-estabilidad', 4, [96, 97, 118, 135, 136, 137, 170, 171]),
 ('C17', 'seo-y-cache', 4, [12, 43, 62, 152, 153]),
]
seen = collections.Counter(h for *_, hs in PLAN for h in hs)
print('asignados:', len(seen), 'de', len(idx), '| duplicados:', [h for h, n in seen.items() if n > 1], '| sin cambio:', sorted(set(idx) - set(seen)), '| inexistentes:', sorted(set(seen) - set(idx)))
for cid, name, fase, hs in PLAN:
    mism = [f"H-{h:03d}(f{idx[h]['fase']})" for h in hs if idx[h]['fase'] != str(fase)]
    sev = 'bloq' if any(idx[h]['sev'] == 'bloq' for h in hs) else ('impo' if any(idx[h]['sev'] == 'impo' for h in hs) else 'meno')
    c = collections.Counter(idx[h]['sev'] for h in hs)
    print(f'{cid} {name:36} f{fase} n={len(hs):2} máx={sev} {dict(c)} fase≠: {mism}')

META = {
 'C01': ('Subir la rama de rescate, devolver el CI a verde (`npm audit fix` y retocar los pines exactos de `package.json` que lo impedían), documentar `.env.example` y versionar en el repo el proceso de release y promoción que hoy vive solo en la Raspberry.', 'Ninguna: va primero.', '3 (proceso de producción)', 'D6 resuelta: rama subida a GitHub el 2026-11-08.'),
 'C02': ('Datos del titular en las páginas legales, política de cookies fiel a lo que se guarda, consentimiento o carga bajo demanda del reproductor de Spotify y retención del historial de Rocky IA.', 'C01.', '3 (datos personales)', 'Datos legales (D2), retención del chat (D3) y Spotify (D4).'),
 'C03': ('Catálogo vivo completo y paginado, productos sin foto, estados de carga y error del catálogo y coherencia de las fichas de drop.', 'C01. Probar contra la tienda de desarrollo real (D7).', '2', 'Tienda de desarrollo real para verificar (D7).'),
 'C04': ('Una sola lista de avisos por drop, respuesta que no revele si un email ya está apuntado, reconocimiento de productos más allá de los 50 últimos y accesibilidad del formulario.', 'C03 (handles de producto).', '3 (migración de datos personales: emails)', '—'),
 'C05': ('ErrorBoundary y recuperación de chunks, contrato único de errores (`HttpError` con `code` y log), mensajes por contexto y sonda de salud.', 'C01.', '2', '—'),
 'C06': ('Política de origen que no bloquee los recursos propios (alias y `www.`) y comportamiento coherente de la puerta: HEAD, salud, errores de campo, caducidad del acceso y vuelta a la ruta pedida.', 'C05 (contrato de errores).', '3 (seguridad)', '—'),
 'C07': ('Carrito que se recupera de un carrito caducado o pagado, cierre de sesión local aunque falle Shopify, token revocado, errores de login con vuelta a la tienda, estados de carga y error del carrito y las pruebas que faltan.', 'C05.', '3 (sesiones y pago)', 'Tienda de desarrollo real para verificar (D7).'),
 'C08': ('Búsqueda de productos y filtros de Rocky IA, uso del catálogo vivo en modo Shopify, no llamar al modelo cuando no hace falta, cancelación al cerrar la barra y accesibilidad del historial.', 'C03.', '2', '—'),
 'C09': ('Marco «Tinta Azul», perfil que no se queda colgado, webhooks tolerantes a la versión de API, registrados después de procesarse y con las desinstalaciones atendidas, formato español de cifras y accesibilidad de cromos y canjes.', 'C05.', '3 (créditos ligados a pedidos)', '—'),
 'C10': ('Remezclar y enlaces de beat, audio del ranking controlable, protección contra votos y reportes abusivos, moderación, paso 16 visible, REC y accesibilidad de la mesa.', 'C12 (gestión de foco común).', '3 (autorización de la moderación y antiabuso del ranking)', '—'),
 'C11': ('Estado real de la radio al apagar la noche, setlist coherente, recuperación de pistas, spray por ruta y robusto ante datos corruptos, linterna y capas en móvil.', 'C12.', '2', '—'),
 'C12': ('Bloqueo de scroll que funcione, «Saltar al contenido», menú móvil cerrable desde dentro, foco y anuncio al cambiar de ruta, foco que no cae al `<body>`, intro saltable y movimiento reducido en vivo.', 'C01. Va antes de C08–C11 porque fija los patrones de foco que usan.', '2', '—'),
 'C13': ('Decisión de marca y su aplicación, contraste de día y de noche en los tokens, tipografía monoespaciada como token y colisiones de personajes con texto y CTA.', 'Fase 2 terminada (para no rehacer pantallas).', '2', 'Nombre de marca (D1).'),
 'C14': ('Convención de nombres del arte, reorganización de `src/images/` y `public/products/`, pósters duplicados y salida de `posters/` y `prompts-munecos/` según `docs/marketing/`.', 'C13 (prefijo de marca).', '2', 'Acuerdo para mover o borrar `posters/` y `prompts-munecos/` (D5).'),
 'C15': ('Fotos de producto a su tamaño con variantes por ancho, animaciones del pie y de la Estampida más ligeras o diferidas, audio y descargas innecesarias.', 'C14 (no optimizar ficheros que luego se mueven).', '2', '—'),
 'C16': ('LCP y CLS: dividir el JS común, no diferir la imagen LCP, reservar alto del contenido, y coste de lienzo, linterna y observadores de noche.', 'C15.', '2', '—'),
 'C17': ('Canónico y metadatos por ruta, 404 reales, URLs duplicadas y caché de los recursos de la puerta.', 'C05 (404 de la SPA).', '2', '—'),
}
lines = []
w = lines.append
w('# Plan de fases 2–4')
w('')
w('Agrupación de los **175 hallazgos confirmados** de `hallazgos.md` en **17 cambios candidatos**, '
  'cada uno pensado para abrirse como un cambio OpenSpec propio con `openspec-propose` cuando el '
  'usuario lo apruebe. Cada hallazgo está en exactamente un cambio; la comprobación es mecánica '
  '(`herramientas/plan.py`: 175 de 175 asignados, sin duplicados, y la fase del cambio coincide con '
  'la fase propuesta de cada hallazgo). Los 7 IDs pendientes y los 3 descartados de `hallazgos.md` '
  'no entran en ningún cambio.')
w('')
w('Nivel de riesgo según `engineering-workflow`: **2** funcional (especificación, TDD, revisión '
  'independiente); **3** crítico (además diseño con alternativas, revisión de seguridad y '
  'aprobación explícita antes de implementar).')
w('')
w('## Decisiones que necesita el usuario')
w('')
w('| Id | Decisión | Bloquea |')
w('| --- | --- | --- |')
for d, txt, blk in [
 ('D1', 'Nombre de la marca: «ROCKY 035» o «ROCKY 35» (logotipo y marquesina dicen 35; rótulo, pie y dominio, 035).', 'C13, C14'),
 ('D2', 'Datos del titular para las páginas legales: nombre o razón social, NIF y domicilio.', 'C02 (bloqueante para abrir la web)'),
 ('D3', 'Historial de Rocky IA: dejar de guardarlo, o guardarlo con plazo, decirlo en la política y permitir borrarlo.', 'C02'),
 ('D4', 'Reproductor de Spotify en `/estudio`: cargarlo solo al pulsar (fachada), pedir consentimiento o quitarlo.', 'C02'),
 ('D5', 'Mover o borrar `posters/` y `prompts-munecos/` (`CLAUDE.md` exige acuerdo previo; plan en `docs/marketing/`).', 'C14'),
 ('D6', 'Subir `rescate/produccion-2026-09-29` a GitHub y cómo se publica a partir de ahora (release desde commits remotos).', 'C01 y todo lo demás'),
 ('D7', 'Credenciales de la tienda de desarrollo para verificar contra Shopify real lo que hoy solo se probó con el doble.', 'Cierre de C03 y C07; los 4 pendientes de Shopify real'),
]:
    w(f'| {d} | {txt} | {blk} |')
w('')
w('## Orden recomendado')
w('')
w('1. **C01** primero: sin la rama en GitHub y el CI en verde no hay base fiable para nada más.')
w('2. **C02** (legal: contiene el único bloqueante, H-007, y necesita D2) y **C03** (catálogo: H-008, que pasa a bloqueante si la tienda real publica más de 8 productos), en paralelo.')
w('3. **C12** antes de los cambios por área: fija los patrones de scroll y foco que reutilizan C08–C11.')
w('4. **C05 → C06** (errores y puerta) y después los cambios por área, que tocan ficheros distintos y '
  'pueden ir en paralelo: C04, C07, C08, C09, C10, C11.')
w('5. **Fase 3**: C13 (con D1) y después C14.')
w('6. **Fase 4**: C15 (tras C14), C16 y C17. Al terminar, repetir `metricas.md` con los mismos '
  'comandos y la batería de Playwright de la auditoría para comparar.')
w('')
w('## Cambios candidatos')
w('')
w('| Cambio | Nombre propuesto | Fase | Hallazgos | Severidad máx. | Nivel | Depende de |')
w('| --- | --- | ---: | ---: | --- | --- | --- |')
SEVN = {'bloq': 'bloqueante', 'impo': 'importante', 'meno': 'menor'}
for cid, name, fase, hs in PLAN:
    sev = 'bloq' if any(idx[h]['sev'] == 'bloq' for h in hs) else ('impo' if any(idx[h]['sev'] == 'impo' for h in hs) else 'meno')
    w(f"| {cid} | `{name}` | {fase} | {len(hs)} | {SEVN[sev]} | {META[cid][2]} | {META[cid][1]} |")
w('')
for cid, name, fase, hs in PLAN:
    alc, dep, lvl, dec = META[cid]
    w(f'### {cid} · `{name}` (fase {fase})')
    w('')
    w(f'**Alcance.** {alc}')
    w('')
    w(f'**Nivel de riesgo:** {lvl}. **Depende de:** {dep} **Decisión pendiente:** {dec}')
    w('')
    w('| Hallazgo | Severidad | Título |')
    w('| --- | --- | --- |')
    for h in sorted(hs, key=lambda x: ({'bloq': 0, 'impo': 1, 'meno': 2}[idx[x]['sev']], x)):
        w(f"| H-{h:03d} | {SEVN[idx[h]['sev']]} | {idx[h]['title'].replace('|', '/')} |")
    w('')
w('## Propuesta aparte (sin hallazgos)')
w('')
w('- **`pruebas-e2e`** (nivel 2): convertir los scripts de Playwright de la auditoría '
  '(`scratchpad/e1/` y `scratchpad/e2/`, con el doble de Shopify y OpenRouter) en una batería e2e '
  'mantenida en el repo, para que cada cambio de las fases 2–4 pruebe sus recorridos. Añade una '
  'dependencia de desarrollo (`@playwright/test`, versión fijada) que habría que justificar en su '
  'propuesta. Mientras no exista, los scripts de la auditoría se pueden reutilizar a mano.')
w('')
w('## Aprobación')
w('')
w('Pendiente (tarea 7.3).')
open('plan-fases.md', 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('plan-fases.md escrito')
