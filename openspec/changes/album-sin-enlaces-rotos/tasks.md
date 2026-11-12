## 1. Datos y resolución del enlace

- [x] 1.1 Prueba que falla: ningún «Visto en» de `src/data/crew.js` empieza por `/product/`, y
  El Vigía y El Nube llevan `anyProductPage: true` (en `src/features/crew/vistoEn.test.js`).
- [x] 1.2 Prueba que falla: `vistoEnTo(vistoEn, products)` da la ficha del primer producto (con
  el handle codificado), `/` sin productos y el `to` de siempre para el resto de cromos.
- [x] 1.3 Implementación: `src/features/crew/vistoEn.js` y los dos cromos en `src/data/crew.js`.

## 2. El álbum

- [x] 2.1 Prueba que falla en `Crew.test.jsx`: con catálogo, el reverso de El Vigía enlaza a la
  ficha del primer producto; sin catálogo, a `/`; El Recadero sigue en `/products/agotado`.
- [x] 2.2 Implementación: `Crew` recibe `products` y `App.jsx` le pasa `commerce.products`.

## 3. Verificación y revisión

- [x] 3.1 El mapa de Lacoma sigue igual: `src/features/mapa/*.test.*` en verde, con los mismos
  vecinos en «Los bancos de La Salle».
- [x] 3.2 En la web local, contra la tienda de pruebas: el enlace de El Vigía y el de El Nube
  abren una ficha que existe.
- [x] 3.3 `npm run check` en verde, con el JavaScript inicial dentro de su límite.
- [x] 3.4 Revisión independiente con Fable y contexto limpio; corregir lo válido.

## Evidencia (12-nov)

- **Antes:** el reverso de El Vigía y el de El Nube enlazaban a `/product/rockyracing`, que en la
  web local contra la tienda de pruebas abría «Producto no encontrado».
- **Después:** los dos enlazan a `/product/rocky-ya-llego` («Ya llegó»), una ficha en la que salen
  los dos. El Recadero sigue en `/products/agotado`.
- **Pruebas:** todas fallaron primero por lo esperado. La de `App.test.jsx` falla si se quita la
  prop `products` del álbum.
- **`npm run check`:** en verde, 2081 pruebas. El JavaScript inicial pasa de 99,95 a 99,97 kB
  (límite 100): la prop de `App.jsx` y el nombre nuevo del trozo del álbum, que va dentro.
- **Revisión (Fable, contexto limpio, una ronda):** sin bloqueantes ni importantes, con cuatro
  menores. Se corrigieron tres: el supuesto mal dicho de la propuesta, la prueba que faltaba del
  cableado en `App.jsx` y `vistoEnTo` con `products` a `null`. El cuarto, que en el modo demo la
  ficha elegida puede ser de un drop bajo llave, queda anotado en «Supuestos».
