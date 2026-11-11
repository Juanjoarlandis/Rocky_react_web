# Tareas: la esquina de la espera

Nivel 3: no se implementa hasta que el usuario lo apruebe. TDD en cada tarea: prueba en rojo
por la razón esperada, implementación mínima, refactor en verde. Antes de empezar, línea base:
`npm run test:run` y `npm run budget:check`.

## 0. Aprobación

- [x] 0.1 El usuario aprueba el cambio: umbral de 10, decenas hacia abajo y el texto «Ya son N apuntados esperando en la esquina». Verificación: su respuesta en la conversación.
  - Aprobado el 2026-11-11 («Apruebo la esquina»), sin cambios.

## 1. Una sola cuenta

- [x] 1.1 Pruebas de `countPending(avisos, claves)` en `server/services/avisos.test.mjs`:
  - cuenta emails distintos entre varias claves;
  - no cuenta los enviados;
  - una clave sin lista cuenta 0.

  Rojo, después la función (D2).
- [x] 1.2 `countNotices` de El Taller usa `countPending`. Verificación: `npx vitest run server/services/drops` en verde sin tocar sus pruebas.

## 2. El número en `/api/drops`

- [x] 2.1 Pruebas de `server/services/esquina.test.mjs` con reloj falso:
  - 143 → 140 en `drops` y en `featured`;
  - 9 → sin campo;
  - un drop a la venta no lleva campo;
  - 50 llamadas a la vez leen una vez;
  - pasado el minuto se relee;
  - si la lista falla, el payload sale igual y el registro lleva solo un código.

  Rojo, después `server/services/esquina.mjs` (D1, D3, D4 y D5).
- [x] 2.2 Prueba de `server/http/routes/drops.test.mjs`: con avisos sembrados en el almacén de la prueba, la respuesta del anunciado lleva `waiting` y ningún email. La prueba que fija la forma sin avisos sigue igual. Rojo, después la ruta y `server/app.mjs`.

## 3. El cartel

- [x] 3.1 Pruebas de `Cartel.test.jsx`:
  - con `waiting: 140`, la línea dice «Ya son 140 apuntados esperando en la esquina»;
  - sin `waiting` no hay línea;
  - en un drop a la venta no hay línea aunque llegue el campo.

  Prueba de contrato del CSS: las cabecitas son un `::before` sin texto con la máscara del token. Rojo, después `Cartel.jsx`, `cartel.css` y `--cabecita` (D6). Verificación: `npm run build` y `npm run budget:check` dentro de límites; si no cabe, se para y se pregunta.

  - Medido tras la build: JavaScript inicial 99,93/100 kB y CSS inicial 13,76/15 kB. La clase es `.cartel-espera`, porque `.cartel-esquina` ya era la esquina despegada de las últimas horas.

## 4. Seguridad y verificación

- [x] 4.1 Revisión de seguridad (skill `security-review`) del diff: que no salga ningún dato por aviso, que no haya oráculo nuevo, que sea fail-closed, y sus registros.
  - Hecha el 2026-11-11 (skill `security-review`, con Fable): ninguna vulnerabilidad que llegue al umbral. Revisado: que solo sale un entero, la clave de la caché, el camino de error y sus registros, la autorización, XSS e inyección. Nota sobre el límite del redondeo recogida en D3.
- [x] 4.2 Comprobación en el navegador sin ventana sobre :3006. Se siembran 23 avisos con direcciones `.test` solo en el almacén del scratchpad, nunca en la Raspberry. El cartel de la portada y el del muro dicen «Ya son 20…» de día y de noche y en móvil, y con 9 no sale nada.
  - Hecha el 2026-11-11 sobre :3006 con un almacén nuevo del scratchpad, con el límite de altas subido solo en ese arranque (`AVISOS_RATE_LIMIT_MAX=100`). Con 9 avisos no sale el campo. Con 23, tras caducar la caché, `waiting: 20` en el drop y en el destacado, sin ningún «@». La línea sale en la portada y en el muro, de día y de noche, y en móvil no desborda.
- [x] 4.3 `npm run check` en verde y ningún límite subido.
- [x] 4.4 Revisión independiente con Fable 5.2 y contexto limpio (skill `engineering-review`), con dos rondas como máximo.

  - Hecha el 2026-11-11 en una ronda con Fable 5.2 y contexto limpio: sin bloqueantes. Corregido con su prueba:
    - el fallo de un drop ya no borra el número de los demás;
    - un fallo se registra una vez y se espera 10 s antes de releer;
    - un anunciado sin fuente no publica número a la baja;
    - prueba HTTP del fallo;
    - la prueba de CSS falla con una aserción y no con un TypeError;
    - redacción del spec y de D5 y D6.

    El cableado de `server/app.mjs` no tiene prueba automática; lo cubre la comprobación de extremo a extremo de 4.2.

## Workflow follow-up

- Commit, publicación y archivo solo cuando el usuario lo pida.
- Deuda aparte: la respuesta de alta de avisos dice si un email ya estaba (`duplicate`).
