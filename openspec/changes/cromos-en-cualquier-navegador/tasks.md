## 1. Contrato y arreglo

- [x] 1.1 Prueba que falla en `src/styles/giro-3d.test.js`: toda regla con
  `backface-visibility: hidden` declara `isolation: isolate`; con su prueba del comprobador.
- [x] 1.2 Arreglo: `isolation: isolate` en `.crew-card-face` (`src/styles/pages/crew.css`).

## 2. Verificación en navegadores reales

- [x] 2.1 Firefox: El Tumbao y El Paquetes (fichados y sin fichar), Los Fundadores y un cromo con
  brillo enseñan el expediente al derecho y sin sello transparentado, de día y de noche.
- [x] 2.2 Chrome con y sin ventana, en escritorio y en móvil: igual que antes.
- [x] 2.3 `npm run check` en verde.

## 3. Revisión

- [x] 3.1 Revisión independiente con Fable y contexto limpio; corregir lo válido.

## Evidencia (12-nov)

- **Antes:** producción sirve los mismos 64 ficheros JS, CSS y HTML que el build local. En Firefox
  158, los cromos fichados giraban en espejo y con el sello transparentado; en Chrome 157, con y sin
  ventana, salían bien.
- **Causa aislada en Firefox** con cambios por CSSOM comprobados antes de cada captura (la CSP,
  `style-src 'self'`, bloquea un `<style>` inyectado y anuló una primera tanda de experimentos):
  - sin el sello, el giro sale bien;
  - con su mezcla en `normal`, la orientación es correcta, pero el sello se transparenta;
  - con `isolation: isolate` en las caras, los tres cromos salen al derecho y sin sello.
- **RED → GREEN:** la prueba de contrato señala `pages/crew.css .crew-card-face` sin el arreglo y
  pasa con él.
- **Navegadores con el build arreglado:**
  - Firefox: Los Fundadores, El Tumbao (con brillo) y El Paquetes, ya fichados y sin fichar, de día
    y de noche, enseñan el expediente al derecho y sin sello;
  - Chrome con y sin ventana, en escritorio (1440) y en móvil (390): los ocho giros, en el reverso;
  - la cara de delante no cambia y el sello sigue en `multiply`.
- **`npm run check`:** en verde, 2088 pruebas; el CSS inicial no cambia (13,78 kB).
- **Revisión (Fable, contexto limpio, una ronda):** sin bloqueantes. El hallazgo importante es que
  Safari queda sin verificar, y está escrito en «Límites». Los menores:
  - corregidos: el prefijo `-webkit-` solo, mayúsculas, un `isolation` anulado en la misma regla,
    `@keyframes` y el brillo que también se transparentaba;
  - anotados en «Límites»: el alcance del contrato y la función `cssFiles` repetida.
  El revisor reprodujo además el síntoma del usuario en Firefox: a 120° de giro se ve la cara de
  delante en espejo.

