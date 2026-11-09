# Tasks

Nivel 3. Necesita aprobación explícita del usuario antes de implementar. TDD en cada tarea de lógica: prueba en rojo, implementación mínima y refactor en verde. Antes de empezar, línea base de `npm run test:run`.

## 1. El modelo de la pared (servidor)

- [ ] 1.1 `server/services/pared/validacion.mjs`: valida página (rutas fijas y handles), ancho y trazo (paleta, topes de puntos y chorretones, rangos de `dx` e `y`, semilla). Verifica: pruebas de cada tope y de entradas hostiles (tipos raros, arrays enormes, `NaN`, `__proto__`, rutas inventadas o con `..`).
- [ ] 1.2 `server/services/pared/firmas.mjs`: genera la firma (vocabulario de la crew, guion y número) y la clave de autor (16 caracteres del SHA-256 de la sesión con la sal del fichero). Verifica: pruebas de formato, estabilidad por sesión y que no hay texto libre.
- [ ] 1.3 `server/services/pared/model.mjs`, en memoria:
  - pintar, con orden, tope por pared, quitar lo más antiguo y tope por autor y día;
  - deshacer y borrar lo propio, y rechazar lo ajeno;
  - reportar una sola vez por quien reporta, con 3 para ocultar;
  - lo de una firma oculta no se publica;
  - tope de 60 paredes;
  - `version` por pared.

  Verifica: pruebas de cada escenario de `pared-compartida` y `moderacion-de-la-pared` en el modelo.
- [ ] 1.4 Persistencia: `pared.enc` con `EncryptedStore`, escritura aplazada a 60 s y en `SIGTERM` por la cola serie, y arranque tolerante a un fichero corrupto (pared vacía, apagada y error en el log). Verifica: pruebas con reloj falso de que hay una escritura por ventana, de ida y vuelta a disco y de que un fichero corrupto ni tumba el arranque ni se pisa.
- [ ] 1.5 Configuración: `SHARED_WALL_ENABLED` (apagada por defecto) y `SHARED_WALL_PATH`, más el interruptor guardado. Verifica: pruebas de cada combinación de «Sin configurar» y del interruptor.

## 2. La API pública

- [ ] 2.1 `server/http/routes/pared.mjs`:
  - `GET` con `ETag` y 304;
  - `POST /trazos`, `DELETE /trazos/:id`, `DELETE /mios` y `POST /reportes`;
  - `requireOrigin`, `validate.mjs`, límites con `client-key` (40 trazos por minuto, 20 reportes por hora), `no-store` y errores `HttpError`.

  Montarla en `server/app.mjs`.

  Verifica: pruebas de integración contra la app con el contrato de D3, incluidos 400, 403 (`WALL_NOT_YOURS`, `WALL_HIDDEN_AUTHOR`), 429, Origin ajeno, firma ignorada en el cuerpo y respuesta `{ enabled: false }` con la pared apagada.

## 3. El spray en el cliente

- [ ] 3.1 `src/api/pared.js` y la lógica de capas de `Spray.jsx`:
  - pintadas antiguas solo locales;
  - la pared común;
  - subir al soltar, y quedarse en local con aviso si falla;
  - deshacer y borrar contra el servidor;
  - sondeo cada 20 s con `If-None-Match` solo con el neón encendido y la pestaña visible;
  - cambio de pared al cambiar de ancho.

  Verifica: pruebas de componente con `fetch` falso para cada escenario de `pared-compartida` del lado del cliente (aviso la primera vez, fallo al subir, pared apagada, deshacer y borrar, nada antiguo subido).
- [ ] 3.2 `drawTag` en `paint.js` (firma junto a la caja de cada autor) y el modo «Reportar» más la lista accesible «Firmas en esta pared». Verifica: pruebas de la caja de cada autor y de la lista (nombres accesibles, «(tú)», reportar con el teclado y confirmación).

## 4. La limpieza en El Taller

- [ ] 4.1 Las rutas `/api/taller/pared`: listar, leer, ocultar, mostrar, borrar por firma, limpiar y encender o apagar, con `requireTaller` y `requireOrigin`, y su línea en el registro. Verifica: pruebas de cada acción, de 401 sin sesión y de que el registro no lleva datos personales.
- [ ] 4.2 La pestaña «La pared» del panel: selector de página y ancho, vista previa con `paint.js`, firmas con acciones (con `BotonConfirmar` en las de borrar) e interruptor. Verifica: pruebas de componente en `Taller.test.jsx`.

## 5. Textos y documentación

- [ ] 5.1 `Legal.jsx`: las pintadas son públicas y anónimas, van firmadas con un tag generado y se conservan hasta que las tapan, las borra su autor o las limpia la crew. Verifica: prueba de la página legal.
- [ ] 5.2 `docs/ops/pared.md`: cómo encender, apagar y limpiar; la decisión pendiente sobre moderación previa antes de quitar la puerta de acceso; y la copia y restauración de `pared.enc`. `.env.example` con las variables nuevas. Verifica: `npm run security:check` en verde.

## 6. Verificación y cierre

- [ ] 6.1 `npm run check` en verde.
- [ ] 6.2 Recorrido de Playwright con dos navegadores contra el servidor de desarrollo:
  - lo que pinta uno lo ve el otro en menos de un minuto;
  - deshacer y borrar solo lo propio;
  - tres reportes de visitantes distintos lo ocultan;
  - El Taller limpia y apaga, y el spray vuelve al modo local;
  - las paredes ancha y estrecha están separadas;
  - nada se cae a 375 px.

  Verifica: el script termina con todo OK y deja capturas.
- [ ] 6.3 Revisión de arte de las firmas y de la lista de firmas, de noche, a 375 y 1440 px.
- [ ] 6.4 Revisión independiente (`engineering-review`) y de seguridad (`security-review`), y corrección de los bloqueantes en dos rondas como mucho.

## Workflow follow-up

- Publicar con `docs/ops/publicar.md` y encender la pared con `SHARED_WALL_ENABLED=true` cuando el usuario lo pida.
- Antes de quitar la puerta de acceso de la web, decidir si se pasa a moderación previa.
- Archivar el cambio con estado VERIFIED y la conformidad del usuario.
