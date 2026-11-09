# Proposal

## Why

En el modo neón cualquiera puede coger el spray y pintar la pared, pero lo que pinta solo se guarda en su navegador (`sprayStore`, `localStorage`): nadie más lo ve. La pared callejera, que es la gracia del descontrol, está vacía para todos menos para quien pinta.

El usuario quiere que las pintadas sean comunes a todos los visitantes, y eso convierte el spray en contenido publicado por desconocidos. Hace falta guardarlo en el servidor, ponerle límites, moderarlo y no frenar el resto del servidor ni gastar la tarjeta SD de la Raspberry, que ya ha corrompido ficheros.

## What Changes

- **La pared es de todos.** Con el modo neón encendido, cada trazo que se pinta se guarda en el servidor y lo ve todo el que pase por esa página de noche.
  - Lo nuevo tapa lo viejo, y cada pared tiene un tope de pintura: al pasarlo, se borra lo más antiguo.
  - Lo que pintan otros aparece sin recargar en menos de un minuto.
- **Dos paredes por página.** Una para pantallas anchas y otra para estrechas: los trazos se guardan con la posición de la página y en móvil el contenido cae en otro sitio.
- **Firmas sin texto libre.** Cada visitante pinta con un tag que genera el servidor con el vocabulario de la crew (por ejemplo «LUNA-7»), pintado pequeño junto a lo suyo. Nadie escribe su nombre: no hay nombres ofensivos ni datos personales.
- **Cada uno manda en lo suyo.** «Deshacer» y «Borrar» quitan solo los trazos propios de esa pared.
- **Lo pintado antes se queda donde estaba.** Lo pintado antes de este cambio se prometió «en tu navegador», así que se queda solo ahí y no se sube nunca.
- **Moderación después de publicar.**
  - Cualquiera puede reportar una pintada.
  - Con 3 reportes de visitantes distintos se oculta sola.
  - En El Taller, una sección «La pared» deja ver cada pared, ocultar o borrar lo de una firma, limpiar una pared entera y apagar la pared compartida al momento.
- **Límites y validación.**
  - Límites por visitante (trazos por minuto y pintura por pared y día) y por página.
  - Formato de trazo validado en el servidor y solo páginas conocidas.
  - Desactivada si no se configura (`SHARED_WALL_ENABLED`).
- **Si la pared común no está.** Si está apagada o no responde, el spray funciona como hoy, solo en el navegador, y lo dice.

## Capabilities

### New Capabilities
- `pared-compartida`: pintar en una pared que ven todos; paredes por página y ancho, tope y orden de la pintura, firmas generadas, deshacer y borrar lo propio, actualización sin recargar, límites, validación y caída al modo local.
- `moderacion-de-la-pared`: reportes, ocultado automático, la limpieza de la pared en El Taller y el interruptor de apagado.

### Modified Capabilities
- Ninguna en `openspec/specs/`. El Taller se especifica en el cambio `sistema-de-drops`, aún sin archivar. La sección nueva de El Taller se especifica aquí, en `moderacion-de-la-pared`.

## Impact

- **Servidor:**
  - `server/services/pared/`: el modelo de pared en memoria con escritura aplazada a un fichero cifrado propio, más firmas y reportes;
  - `server/http/routes/pared.mjs` y rutas nuevas de El Taller;
  - `server/config/` (`SHARED_WALL_ENABLED` y la ruta del fichero);
  - `server/app.mjs`;
  - reutiliza `rate-limit.mjs`, `validate.mjs`, `origin-policy.mjs`, `client-key.mjs` y las sesiones.
- **Cliente:**
  - `src/features/night/spray/` (`Spray.jsx`, `sprayStore.js`, `paint.js` para las firmas) y una API nueva `src/api/pared.js`;
  - El Taller (`src/features/taller/`);
  - el texto de privacidad de `Legal.jsx`.
- **API pública nueva** bajo `/api/pared`: leer una pared, pintar, deshacer, borrar lo propio y reportar. Las rutas de El Taller van bajo `/api/taller/pared`.
- **Datos:** un fichero nuevo `pared.enc` junto al estado, con tope de tamaño. No guarda IP ni datos personales: el autor es una clave derivada de la sesión y una firma generada.
- **Seguridad:** cambio de nivel 3 (contenido de usuarios, abuso y almacenamiento), con revisión de seguridad.
- **Sin dependencias nuevas.**
