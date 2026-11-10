# Tareas: almacén con escritura agrupada

## 1. Línea base

- [ ] 1.1 Ejecutar `npm run test:run` y `npm run test:coverage` con Node 24 y anotar aquí tests y cobertura; repetir `contar-escrituras.mjs` (`docs/auditoria/2026-11/herramientas/fase4/`) y anotar volcados por petición, MB escritos en 1.000 altas y medianas de latencia.

## 2. Almacén: clases de escritura y agrupación

- [ ] 2.1 Añadir a `server/storage/encrypted-file-store.test.mjs` las pruebas de los requisitos de escritura y verlas fallar, con reloj y temporizadores controlados: confirmada por defecto visible desde otra instancia; diferida legible al instante y en disco a los 5 s; 200 diferidas en un solo volcado; una confirmada arrastra a las diferidas pendientes; las que llegan durante un volcado van en el siguiente; `flush()` vuelca y termina; el temporizador no mantiene vivo el proceso.
- [ ] 2.2 Implementar en `EncryptedFileStore` la opción de durabilidad, la ventana de 5 s, el volcado compartido y `flush()` (D2, D4, D6), con la poda de caducados en el volcado, hasta que pasen esas pruebas y, sin tocarlas, todas las que ya había.
- [ ] 2.3 Añadir pruebas de fallo y verlas fallar: un volcado confirmado que falla rechaza y la siguiente lectura devuelve lo que había en disco; un volcado diferido que falla registra un error sin datos del estado y el almacén sigue funcionando; implementar D5 y pasar el logger al almacén desde `create-store.mjs`.
- [ ] 2.4 Añadir pruebas de `fsync` y de temporales y verlas fallar: cada volcado sincroniza fichero y directorio antes de darse por hecho; al cargar se borran los `.tmp` huérfanos del propio fichero y no los de otros; implementar D7.
- [ ] 2.5 Hacer que `MemoryStore` acepte la opción y tenga `flush()`, con su prueba, y verificar que `server/app.test.mjs` y los dobles que heredan de `MemoryStore` siguen en verde.

## 3. Quién escribe diferido

- [ ] 3.1 Sesiones: pruebas en `server/services/sessions.test.mjs`, primero en rojo, de que alta, refresco y `save` no esperan volcado y de que `rotate` y `destroy` sí; implementar.
- [ ] 3.2 Carrito: pruebas en `cart-operations.test.mjs`, primero en rojo, de que una alta con sesión nueva no espera a ningún volcado y de que una operación completada caduca a los 15 min (D9); implementar, actualizando la prueba que fije 24 h si existe y anotándolo aquí.
- [ ] 3.3 Beats, transacciones de login e historial del chat: pruebas, primero en rojo, de que «me mola», reporte, `oauthTransactions` y `chatHistory` son diferidos y de que publicar y retirar un beat son confirmados; implementar.
- [ ] 3.4 Comprobar con pruebas que siguen confirmadas, sin cambiar su código: abono y canje Crew, alta de aviso, tokens de cliente y deduplicación de webhooks (un `orders/paid` respondido con 200 está en disco).

## 4. Leer no escribe

- [ ] 4.1 Añadir a `server/services/crew/rewards.test.mjs` una prueba, primero en rojo, de que leer dos veces un perfil sin cambios escribe una sola vez (la del alta), manteniendo la prueba del `displayName`; implementar D8.

## 5. Apagado y caídas

- [ ] 5.1 Llamar a `store.flush()` en el apagado de `server/index.mjs`, junto a `pared.volcar()`, con una prueba que verifique el orden (cerrar, volcar, salir) y que un fallo del volcado se registra.
- [ ] 5.2 Escribir una prueba de integración que arranque el servidor real como proceso con un almacén temporal y verla pasar: con `SIGTERM` tras una escritura diferida, el dato está al rearrancar; con `SIGKILL` tras un aviso confirmado y una sesión nueva, el fichero se descifra y el aviso está; con `SIGKILL` durante una ráfaga de volcados, se lee un estado completo y no quedan temporales.
- [ ] 5.3 Probar la compatibilidad en los dos sentidos con el almacén antiguo importado desde un `git archive` de `7effff4`: el nuevo lee un fichero escrito por el antiguo, y el antiguo lee uno escrito por el nuevo.

## 6. Medida

- [ ] 6.1 Repetir `contar-escrituras.mjs` y verificar los dos escenarios de «el disco que gasta una operación está acotado»: 30 MB o menos en 1.000 altas y mediana de las últimas 50 no mayor que el doble de las primeras 50. Anotar las cifras aquí y en `linea-base-fase-4.md`.
- [ ] 6.2 Ajustar `contar-escrituras.mjs` para que espere a la ventana de volcado antes de contar, y guardarlo en `herramientas/fase4/`.

## 7. Documentación, seguridad y cierre

- [ ] 7.1 Actualizar `README.md`, `SECURITY.md`, `docs/ops/pared.md` y `docs/ops/drops.md`: qué es confirmado y qué diferido, que una copia en caliente puede no llevar los últimos 5 s de escrituras diferidas, y que `avisos:enviar -- --apply` exige el servidor parado; corregir de paso la mención a `--vaciar` del README, que el script ya no admite.
- [ ] 7.2 Ejecutar `npm run check` y `npm run test:coverage` (umbral del 80 %); revisión de seguridad con `security-review` (sesiones, tokens, cierre de sesión, nada del estado en los logs) y revisión independiente contra `specs/almacen-de-estado/spec.md`. Anotar los resultados aquí.

## Workflow follow-up

- Publicar en producción solo con autorización expresa, después de `servidor-ligero` o junto a él.
- Abrir un cambio propio para el segundo escritor de `enviar-avisos.mjs --apply`.
- Archivar con `openspec-archive-change` tras VERIFIED.
