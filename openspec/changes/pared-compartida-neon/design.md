# Design

## Context

Lo que existe hoy:

- **El spray** (`src/features/night/spray/`) pinta en un canvas detrás del contenido.
  - Un trazo es `{ c, s, p, d }`: índice de color de la paleta (`Lima`, `Violeta`, `Blanco UV`), semilla, puntos `[dx, y, …]` con `dx` respecto al centro de la página, y chorretones.
  - `sprayStore` lo guarda por ruta en `localStorage`, con un tope de 6000 puntos por página y 12 páginas.
  - «Foto» compone una imagen local.
- **El ranking de beats** (`server/services/beats.mjs`) ya resuelve contenido de usuarios:
  - la autoría por la sesión, con un hash corto;
  - reportes, con 3 para ocultar;
  - límites diarios;
  - rutas con `requireOrigin` y `validate.mjs`.
- **El almacén de estado** (`EncryptedStore`) reescribe el fichero cifrado entero en cada `set`. La tarjeta SD de la Raspberry ya ha corrompido ficheros (ver la memoria de operación), así que escribir mucho y a menudo es un riesgo real.
- **El Taller** tiene sesión con clave y TOTP, `requireTaller` y su registro de acciones.
- **Decisión del usuario.** Moderación posterior: se ve al momento y se modera después. Era la opción recomendada mientras la web siga tras la puerta de acceso.

## Goals / Non-Goals

**Goals:**
- Una pared común con poco coste para la Raspberry: pocas escrituras, tamaño acotado y peticiones baratas.
- Moderación suficiente para una web cerrada, que pueda endurecerse antes de abrirla al público.

**Non-Goals:**
- Moderación previa (aprobar antes de publicar). Queda como opción para cuando se quite la puerta de acceso.
- Tiempo real con WebSocket o SSE.
- Subir las pintadas antiguas del navegador.
- Cámara rápida, colores que se ganan y el resto de ideas de la lista. Van en otros cambios.

## Decisions

### D1 · El modelo vive en memoria y se escribe a un fichero propio, aplazado
- **El modelo.** `server/services/pared/model.mjs` tiene las paredes en memoria y es la única fuente de verdad mientras el proceso vive. Las mutaciones son síncronas en un solo proceso, así que no hay carreras.
- **El fichero.** El modelo se persiste en `pared.enc`, un `EncryptedStore` propio con la misma `APP_ENCRYPTION_KEY`. Por defecto va junto a `STATE_STORE_PATH`; `SHARED_WALL_PATH` lo cambia.
- **La escritura** se aplaza: como mucho una vez cada 60 s si hubo cambios, y otra al recibir `SIGTERM`. Es una escritura atómica (temporal y `rename`) por la cola serie (`lib/serial-queue`).
- **Si el fichero no se puede leer** (corrupto o con otra clave), el servidor arranca con la pared vacía, apaga la pared compartida y lo registra como error. No se cae, y no pisa el fichero corrupto hasta que El Taller la vuelva a encender.
- **Alternativas descartadas:**
  - El almacén de estado general: reescribiría sesiones, beats y avisos en cada trazo, que es justo el desgaste que la SD no aguanta.
  - SQLite: una dependencia nueva para esto.
  - Teselas PNG: ocupan más, no se pueden moderar por autor y pierden el dibujo vectorial.

### D2 · Datos y topes
- **Pared** `«ruta»|«ancho»`, con `ancho` igual a `ancha` (900 px o más) o `estrecha`:

  ```
  { version, updatedAt,
    strokes: [{ id, a, c, s, p, d, t }],   // en orden de pintado; a = clave de autor
    hidden: { [a]: true },
    reports: { [a]: [claveDeQuienReporta, …] } }
  ```

- **Autores**, aparte: `{ [a]: firma }`.
  - `a` son 16 caracteres del SHA-256 de la sesión con una sal fija del proceso guardada en el fichero, como `voterKeyOf` en los beats.
  - La firma se genera una vez por sesión (palabra de la crew, guion y número de 1 a 99) y se guarda en el registro de la sesión.
- **Topes** (constantes con pruebas):
  - por trazo, 600 puntos y 40 chorretones;
  - `|dx|` ≤ 1600 y 0 ≤ y ≤ 40 000;
  - `c` dentro de la paleta y `s` entero sin signo de 32 bits;
  - por pared, 12 000 puntos en la ancha y 6000 en la estrecha (lo que pinta el móvil). Al pasarlo, se quitan los trazos más antiguos;
  - por autor, pared y día, 4000 puntos;
  - como mucho 60 paredes. Si hace falta una nueva, se borra la que lleva más tiempo sin pintarse.
- **Rutas válidas:** las secciones fijas del enrutador (`/`, `/menudrop`, `/estudio`, `/crew`, `/mi-crew`, `/rockyIA`, `/cart` y `/legal/<página>`), más `/product/<handle>` y `/products/<handle>` con el patrón de handle del servidor. `/taller` queda fuera.

### D3 · Contrato HTTP público (`/api/pared`)
Todo va con `Cache-Control: no-store` y errores `{ message, code }` en castellano. Las mutaciones llevan `requireOrigin`, se validan con `validate.mjs` antes de abrir sesión y tienen límite por cliente (`client-key`, IPv6 por /64).

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/api/pared?pagina=&ancho=` | Devuelve `{ enabled, version, firma, strokes: [{ id, c, s, p, d, firma }], firmas: [{ firma, mia }] }`. Sin lo oculto. Usa `ETag` con `version` y responde 304 con `If-None-Match`. Si la pared está apagada, `{ enabled: false }`. |
| `POST` | `/api/pared/trazos` | Cuerpo `{ pagina, ancho, trazo }`. Responde 201 con `{ id, firma, version }`. 429 si se pasa del límite (40 trazos por minuto y cliente) y 403 `WALL_HIDDEN_AUTHOR` si su firma está oculta en esa pared. |
| `DELETE` | `/api/pared/trazos/:id?pagina=&ancho=` | Quita un trazo propio (204). 403 `WALL_NOT_YOURS` si es de otro. |
| `DELETE` | `/api/pared/mios?pagina=&ancho=` | Quita todos los trazos propios de esa pared (204). |
| `POST` | `/api/pared/reportes` | Cuerpo `{ pagina, ancho, firma }`. Responde 202, cuenta una vez por quien reporta y tiene su propio límite (20 por hora y cliente). |

El cuerpo de `POST /trazos` no acepta ningún campo de firma: el servidor la ignora.

### D4 · El cliente: tres capas en el mismo lienzo
`Spray.jsx` pinta en este orden:
1. las pintadas antiguas del navegador, solo para su dueño;
2. la pared común en orden de pintado, con la firma de cada autor junto a su caja (`drawTag` en `paint.js`, con la fuente de rótulo y el color de su último trazo);
3. los trazos propios aún sin confirmar.

- **Al soltar un trazo** se sube. Si falla, se queda en `localStorage`, como hoy, y aparece un aviso.
- **«Deshacer»** borra en el servidor el último trazo propio confirmado. **«Borrar»** usa `DELETE /mios`.
- **La actualización.** Mientras el neón está encendido y la pestaña visible, la pared se pide cada 20 s con `If-None-Match`, y al cambiar de ancho de clase se pide la otra pared.
- **Reportar** tiene dos entradas:
  - un modo «Reportar» en las herramientas: se pincha una pintada y se elige la firma cuya caja la contiene;
  - una lista accesible «Firmas en esta pared», con un botón por firma y la propia marcada «(tú)».
- **El aviso** de que todo el mundo verá lo que se pinta sale la primera vez que se coge el spray con la pared encendida, y se recuerda en `localStorage`.

### D5 · El Taller: la sección «La pared»
- **Las rutas** van bajo `/api/taller/pared`, todas con `requireTaller` y las de escritura además con `requireOrigin`:
  - listar paredes, con resumen de trazos, firmas, reportes y ocultas;
  - leer una pared, incluido lo oculto;
  - ocultar, mostrar o borrar lo de una firma;
  - limpiar una pared;
  - encender y apagar.
- **La interfaz** añade una pestaña «La pared» al panel. Tiene un selector de página y ancho, una vista previa pintada con `paint.js` a escala, la lista de firmas con sus acciones (con `BotonConfirmar` en las que borran) y el interruptor.
- **El registro.** Cada acción deja una línea `Taller` con la acción y `«ruta»|«ancho»|«firma»`, sin datos personales.

### D6 · Configuración y apagado
- **`SHARED_WALL_ENABLED`** está apagada por defecto, porque sin configurar se deniega.
  - Sin ella, `/api/pared` responde `{ enabled: false }` y El Taller enseña «apagada por configuración».
  - Con ella, el interruptor de El Taller (guardado en `pared.enc`) decide en caliente.
- **Al apagar** se dejan de servir y de aceptar trazos, pero no se borra nada.

### D7 · Privacidad
- No se guardan IP ni datos personales: los límites viven en memoria y el autor es una clave derivada de la sesión.
- La política de privacidad (`Legal.jsx`) añade que las pintadas de la pared son públicas, anónimas y van firmadas con un tag generado. Se quedan hasta que las tapan, las borra su autor o las limpia la crew.

## Risks / Trade-offs

- **[Riesgo] Dibujos ofensivos visibles hasta que se reportan.** → Hoy la web está tras la puerta de acceso. Con 3 reportes se ocultan solos, El Taller limpia y el interruptor apaga al momento. Antes de quitar la puerta conviene decidir si se pasa a moderación previa: queda anotado en `docs/ops/`.
- **[Riesgo] La SD de la Raspberry.** → Un fichero propio, una escritura por minuto como mucho, tamaño acotado (unos 4 MB en el peor caso) y arranque tolerante a un fichero corrupto (D1).
- **[Riesgo] Spam con muchas sesiones.** → El límite es por cliente (IPv6 por /64), no por sesión, y hay tope por autor, pared y día.
- **[Riesgo] Pintar muchos trazos en móvil cuesta.** → La pared estrecha tiene la mitad de tope, y el lienzo ya baja de resolución si hace falta.
- **[Compromiso] Hasta 60 s de pintura perdida si se cae el proceso.** Es aceptable para pintadas.
- **[Compromiso] Sondeo cada 20 s en vez de tiempo real.** Las respuestas 304 cuestan muy poco y no hay conexiones abiertas en la Raspberry.

## Migration Plan

1. **Publicar** la release con `SHARED_WALL_ENABLED` sin poner: la pared queda apagada y el spray funciona como hoy.
2. **Encender** con `SHARED_WALL_ENABLED=true` en `/etc/rocky035/rocky.env` (con copia de seguridad), reiniciar y comprobar desde El Taller.
3. **Volver atrás**, de menos a más:
   - el interruptor de El Taller;
   - quitar la variable y reiniciar;
   - `npm run release:revertir`.

   `pared.enc` se queda en disco y el código anterior lo ignora. Las pintadas antiguas del navegador no se tocan en ningún paso.

## Open Questions

- El vocabulario exacto de las firmas (las palabras de la crew) se fija en la implementación con el de `nightCrew.js` y los nombres de los personajes, y lo revisa el usuario. No cambia el diseño.
