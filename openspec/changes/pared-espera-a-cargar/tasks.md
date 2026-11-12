## 1. Prueba y arreglo

- [x] 1.1 Prueba que falla en `server/http/routes/pared.test.mjs`, con una carga lenta del fichero:
  pintar durante la carga da 201 y el trazo queda; reportar y borrar lo propio durante la carga
  dan 202 y 204; si tras cargar la pared está apagada, pintar da 404 `WALL_DISABLED`.
- [x] 1.2 Arreglo: `activa` espera a `pared.listo` antes de comprobar la pared.

## 2. Verificación y revisión

- [x] 2.1 `server/app.pared.test.mjs` pasa repetido muchas veces con la CPU cargada, donde antes
  fallaba.
- [x] 2.2 `npm run check` en verde.
- [ ] 2.3 La CI de GitHub en verde en la rama del arreglo antes de llevar `main` hasta ella.
- [ ] 2.4 Revisión independiente con Fable y contexto limpio; corregir lo válido.
