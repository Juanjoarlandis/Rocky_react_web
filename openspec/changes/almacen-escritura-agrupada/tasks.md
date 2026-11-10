# Tareas: almacén con escritura agrupada

## 1. Línea base

- [x] 1.1 Ejecutar `npm run test:run` y `npm run test:coverage` con Node 24 y anotar aquí tests y cobertura; repetir `contar-escrituras.mjs` (`docs/auditoria/2026-11/herramientas/fase4/`) y anotar volcados por petición, MB escritos en 1.000 altas y medianas de latencia.
  - 1.631 tests; cobertura del servidor 93 %. Como línea base valen las medidas de `linea-base-fase-4.md` (apartado 5), tomadas con esta herramienta sobre el mismo almacén: 4 volcados por alta con sesión nueva, 2,75 GB escritos en 1.000 altas y 2,0 → 22,7 ms por alta.

## 2. Almacén: clases de escritura y agrupación

- [x] 2.1 Añadir a `server/storage/encrypted-file-store.test.mjs` las pruebas de los requisitos de escritura y verlas fallar, con reloj y temporizadores controlados: confirmada por defecto visible desde otra instancia; diferida legible al instante y en disco a los 5 s; 200 diferidas en un solo volcado; una confirmada arrastra a las diferidas pendientes; las que llegan durante un volcado van en el siguiente; `flush()` vuelca y termina; el temporizador no mantiene vivo el proceso.
- [x] 2.2 Implementar en `EncryptedFileStore` la opción de durabilidad, la ventana de 5 s, el volcado compartido y `flush()` (D2, D4, D6), con la poda de caducados en el volcado, hasta que pasen esas pruebas y, sin tocarlas, todas las que ya había.
  - Los que llegan durante un volcado comparten el siguiente también cuando son confirmados (volcado en grupo).
- [x] 2.3 Añadir pruebas de fallo y verlas fallar: un volcado confirmado que falla rechaza y la siguiente lectura devuelve lo que había en disco; un volcado diferido que falla registra un error sin datos del estado y el almacén sigue funcionando; implementar D5 y pasar el logger al almacén desde `create-store.mjs`.
- [x] 2.4 Añadir pruebas de `fsync` y de temporales y verlas fallar: cada volcado sincroniza fichero y directorio antes de darse por hecho; al cargar se borran los `.tmp` huérfanos del propio fichero y no los de otros; implementar D7.
  - Además, un volcado que falla borra su propio temporal.
- [x] 2.5 Hacer que `MemoryStore` acepte la opción y tenga `flush()`, con su prueba, y verificar que `server/app.test.mjs` y los dobles que heredan de `MemoryStore` siguen en verde.

## 3. Quién escribe diferido

- [x] 3.1 Sesiones: pruebas en `server/services/sessions.test.mjs`, primero en rojo, de que alta, refresco y `save` no esperan volcado y de que `rotate` y `destroy` sí; implementar.
- [x] 3.2 Carrito: pruebas en `cart-operations.test.mjs`, primero en rojo, de que una alta con sesión nueva no espera a ningún volcado y de que una operación completada caduca a los 15 min (D9); implementar, actualizando la prueba que fije 24 h si existe y anotándolo aquí.
  - Ninguna prueba fijaba las 24 h.
- [x] 3.3 Beats, transacciones de login e historial del chat: pruebas, primero en rojo, de que «me mola», reporte, `oauthTransactions` y `chatHistory` son diferidos y de que publicar y retirar un beat son confirmados; implementar.
  - El historial del chat va dentro de `sessions.save`, así que queda cubierto por 3.1. El **consumo** de una transacción de login se deja confirmado (es de un solo uso); diferido es solo su alta.
- [x] 3.4 Comprobar con pruebas que siguen confirmadas, sin cambiar su código: abono y canje Crew, alta de aviso, tokens de cliente y deduplicación de webhooks (un `orders/paid` respondido con 200 está en disco).
  - Pruebas nuevas para avisos y deduplicación de webhooks; Crew, en 4.1. Los tokens de cliente no cambian de código y usan la clase por defecto.

## 4. Leer no escribe

- [x] 4.1 Añadir a `server/services/crew/rewards.test.mjs` una prueba, primero en rojo, de que leer dos veces un perfil sin cambios escribe una sola vez (la del alta), manteniendo la prueba del `displayName`; implementar D8.

## 5. Apagado y caídas

- [x] 5.1 Llamar a `store.flush()` en el apagado de `server/index.mjs`, junto a `pared.volcar()`, con una prueba que verifique el orden (cerrar, volcar, salir) y que un fallo del volcado se registra.
  - En `server/shutdown.mjs` (`closeGracefully`), para poder probarlo; si un volcado falla, el proceso sale con 1.
- [x] 5.2 Escribir una prueba de integración que arranque el servidor real como proceso con un almacén temporal y verla pasar: con `SIGTERM` tras una escritura diferida, el dato está al rearrancar; con `SIGKILL` tras un aviso confirmado y una sesión nueva, el fichero se descifra y el aviso está; con `SIGKILL` durante una ráfaga de volcados, se lee un estado completo y no quedan temporales.
  - `server/shutdown.integration.test.mjs`: el servidor real como proceso, con `cwd` temporal para que no cargue ningún `.env`. La escritura diferida es un «me mola»; la confirmada, un aviso.
- [x] 5.3 Probar la compatibilidad en los dos sentidos con el almacén antiguo importado desde un `git archive` de `7effff4`: el nuevo lee un fichero escrito por el antiguo, y el antiguo lee uno escrito por el nuevo.
  - Comprobado a mano (no como prueba: la imagen de build no trae git) con el almacén de `7effff4`: el nuevo lee lo del antiguo, el antiguo lee lo del nuevo y escribe sobre él, y el sobre conserva sus cuatro claves.

## 6. Medida

- [x] 6.1 Repetir `contar-escrituras.mjs` y verificar los dos escenarios de «el disco que gasta una operación está acotado»: 30 MB o menos en 1.000 altas y mediana de las últimas 50 no mayor que el doble de las primeras 50. Anotar las cifras aquí y en `linea-base-fase-4.md`.
  - 1.000 altas: 1 volcado, 1,37 MB escritos (antes 2,75 GB); mediana 0,7 ms las primeras 50 y 0,3 ms las últimas (antes 2,0 → 22,7 ms).
- [x] 6.2 Ajustar `contar-escrituras.mjs` para que espere a la ventana de volcado antes de contar, y guardarlo en `herramientas/fase4/`.

## 7. Documentación, seguridad y cierre

- [x] 7.1 Actualizar `README.md`, `SECURITY.md`, `docs/ops/pared.md` y `docs/ops/drops.md`: qué es confirmado y qué diferido, que una copia en caliente puede no llevar los últimos 5 s de escrituras diferidas, y que `avisos:enviar -- --apply` exige el servidor parado; corregir de paso la mención a `--vaciar` del README, que el script ya no admite.
- [x] 7.2 Ejecutar `npm run check` y `npm run test:coverage` (umbral del 80 %); revisión de seguridad con `security-review` (sesiones, tokens, cierre de sesión, nada del estado en los logs) y revisión independiente contra `specs/almacen-de-estado/spec.md`. Anotar los resultados aquí.
  - `npm run check` en verde; cobertura del servidor 93 % (umbral 80 %).
  - Revisión independiente (subagente con contexto limpio, una ronda, con pruebas de estrés propias: 1.800 escrituras mezcladas con fallos inyectados y 25 muertes del proceso): 0 bloqueantes, 4 importantes y 7 menores. El núcleo de concurrencia salió sin hallazgos.
  - Corregidos con prueba: la limpieza de temporales podía borrar el de un volcado en curso de otro proceso y hacer fallar una escritura confirmada (ahora solo borra los de más de 10 min); `flush()` podía dejar sin volcar una diferida llegada durante el volcado; salir del Taller pasaba a ser diferido y un volcado fallido podía deshacerlo (ahora es confirmado); las pruebas de 3.4 no ejercitaban el abono ni los tokens; un fallo del `fsync` de directorio daba error con el dato ya escrito; un volcado confirmado fallido no dejaba línea en el log; el reporte que oculta un beat era diferido; `MemoryStore` no validaba la clase; la prueba de la ráfaga era débil; y la compatibilidad de formato tiene ya una prueba con un fichero escrito por la versión anterior.
  - `security-review`: se ejecuta una vez sobre toda la rama al cerrar la fase 4, porque revisa los cambios pendientes de la rama entera; su resultado se anota en el informe final.

## Workflow follow-up

- Publicar en producción solo con autorización expresa, después de `servidor-ligero` o junto a él.
- Abrir un cambio propio para el segundo escritor de `enviar-avisos.mjs --apply`.
- Archivar con `openspec-archive-change` tras VERIFIED.
