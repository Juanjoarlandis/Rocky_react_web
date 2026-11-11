# Proposal

## Why

El cartel de un drop anunciado cuenta los segundos que faltan, pero no cuenta que haya nadie
esperando. En el streetwear la cola es parte del drop: saber que hay gente en la esquina
empuja a apuntarse. El dato ya existe, porque cada «Avísame» del cartel se guarda, pero no
sale de la lista cifrada, y está bien que no salga.

El usuario lo eligió el 2026-11-11 («Ahora la esquina de la espera»), con la condición que se
le propuso: un número real, nunca inflado.

**Nivel 3.** El número sale de la lista de avisos, que guarda emails. La regla de seguridad
del proyecto pide revisión de seguridad y aprobación explícita antes de implementar.

## What Changes

- **`/api/drops` dice cuántos esperan.** Cada drop anunciado lleva un `waiting` con sus avisos
  pendientes (sin enviar y sin repetir email), redondeado a la decena de abajo. Solo aparece
  desde 10; por debajo, el campo no se manda.
- **El cartel lo enseña.** Bajo la cuenta atrás: «Ya son 140 apuntados esperando en la
  esquina», con una fila de cabecitas de la crew dibujadas como decoración. Sin `waiting`, el
  cartel no cambia.
- **Una sola cuenta.** El Taller y el cartel cuentan igual: la cuenta de El Taller pasa a ser
  la del servicio de avisos, sin cambiar lo que El Taller enseña.
- **Fallar hacia «como hoy».** Si la cuenta falla, `/api/drops` responde igual que ahora, sin
  el número: la cuenta atrás y la recarga del catálogo no pueden depender de ella.

## Capabilities

### New Capabilities

- `esquina-de-la-espera`: cuántos avisos pendientes tiene un drop anunciado, cómo se publica
  ese número y cómo lo enseña el cartel.

### Modified Capabilities

Ninguna en `openspec/specs/`, que sigue vacío. Se toca el comportamiento del cartel anunciado
(`pulido-artistico/specs/cartel-anunciado`) y de `/api/drops` (`sistema-de-drops/specs/
calendario-de-drops`) solo de forma aditiva: un campo opcional y una línea opcional.

## Fuera de alcance

- **Tiempo real.** Nada de WebSocket ni de SSE (`pared-compartida-neon/design.md`, Non-Goals):
  el número se refresca cuando el cliente vuelve a pedir los drops.
- **Verificar los avisos** (doble opt-in). El número cuenta apuntados, no personas
  verificadas, y el texto lo dice así: «apuntados».
- **Contar en drops a la venta, cerrados o del archivo.** Solo en el anunciado.
- **El número exacto.** Se publica en decenas hacia abajo (ver `design.md`).

## Supuestos

- **Umbral de 10 y decenas hacia abajo.** Por debajo de 10 la cifra resta en vez de sumar, y
  redondear hacia abajo nunca dice más de lo que hay.
- **Copy: «Ya son N apuntados esperando en la esquina».** Con el redondeo, «ya son» es cierto,
  porque hay al menos N.
- **Las cabecitas** son un dibujo propio de una línea, con las gafas de diana de la familia, en
  CSS. No son retratos de nadie ni dependen del número.

## Impact

- **Servidor:**
  - `server/services/avisos.mjs`: nueva función `countPending`.
  - `server/services/esquina.mjs` (nuevo): añade el número al payload, con caché.
  - `server/services/drops/taller.mjs`: usa `countPending`.
  - `server/http/routes/drops.mjs` y `server/app.mjs`: la composición.
- **Cliente:** `src/features/drops/Cartel.jsx` y `src/styles/components/cartel.css`; un token
  en `00-tokens.css`.
- **Presupuesto:** `Cartel` es JavaScript inicial, con 0,13 kB de margen. Ver la salida de
  `design.md` si no cabe.
- **Datos personales:** solo sale un número redondeado; ningún email ni señal por email. Sin
  migraciones ni cambios en el almacén.
- **Sin dependencias nuevas.**
