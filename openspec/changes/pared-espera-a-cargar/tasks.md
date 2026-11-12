## 1. Prueba y arreglo

- [x] 1.1 Prueba que falla en `server/http/routes/pared.test.mjs`, con una carga lenta del fichero:
  pintar durante la carga da 201 y el trazo se suma a lo guardado; deshacer, borrar lo propio y
  reportar durante la carga dan 403, 204 y 202; si tras cargar la pared está apagada o su fichero
  corrupto, pintar da 404 `WALL_DISABLED`.
- [x] 1.2 Arreglo: `activa` espera a `pared.listo` antes de comprobar la pared.

## 2. Verificación y revisión

- [x] 2.1 `server/app.pared.test.mjs` pasa repetido muchas veces con la CPU cargada, donde antes
  fallaba.
- [x] 2.2 `npm run check` en verde.
- [x] 2.3 La CI de GitHub en verde en la rama del arreglo antes de llevar `main` hasta ella.
- [x] 2.4 Revisión independiente con Fable y contexto limpio; corregir lo válido.

## Evidencia (12-nov)

- **Causa reproducida:** con una carga lenta, un trazo enviado durante la carga daba 404
  `WALL_DISABLED` y tras la carga 201.
- **RED → GREEN:** sin el arreglo fallan los casos de pintar (404≠201) y de deshacer (404≠403,
  el mismo fallo que en la CI); con él pasan los cuatro. La prueba sabe por una señal, no por un
  tiempo de espera, que la petición ya llegó a la comprobación de la pared.
- **Bajo carga de CPU,** `server/app.pared.test.mjs` fallaba en 2 de 12 ejecuciones sin el
  arreglo y en 0 de 20 con él.
- **CI de GitHub:** verde en la rama del arreglo, dos veces con el primer commit (`15f84bd`) y
  otra con el de la revisión (`0b51112`); en `main` fallaba en todas las ejecuciones desde el
  11-nov.
- **Revisión (Fable, contexto limpio, una ronda):** sin bloqueantes. Dos importantes, los dos en
  la prueba (una espera de 50 ms que no garantizaba nada y casos sin cubrir), corregidos. De los
  cuatro menores: se quita una espera que sobraba en `POST /trazos`, dos quedan como riesgos
  aceptados en la propuesta y la duplicación con El Taller no se toca.

