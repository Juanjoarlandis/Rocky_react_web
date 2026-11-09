# Spec Delta

## Purpose

El Taller es el panel privado de la crew para programar, configurar, editar y publicar
drops completos desde la propia web, con una entrada segura y sin tocar código.

## ADDED Requirements

### Requirement: El Taller está apagado si no está configurado
El Taller SHALL estar activo solo cuando estén configurados todos estos elementos:
- el hash de su contraseña;
- su secreto TOTP;
- las credenciales Admin de Shopify;
- el id de la publicación Headless.

En producción, el secreto TOTP SHALL ser obligatorio. Apagado, `/api/taller/*` SHALL
responder 404 y la página del Taller SHALL decir que no está disponible.

#### Scenario: Sin configuración
- **WHEN** el servidor arranca sin hash de contraseña del Taller
- **THEN** `/api/taller/sesion` responde 404 y el resto de la web funciona igual

#### Scenario: Producción sin TOTP
- **WHEN** el servidor arranca en producción con contraseña pero sin secreto TOTP
- **THEN** el Taller queda apagado y el arranque lo registra

### Requirement: Para entrar hacen falta la contraseña y un código
La entrada SHALL pedir contraseña y código TOTP de 6 dígitos:
- la contraseña se comprueba contra un hash scrypt, en tiempo constante;
- el código vale en su ventana de 30 s o la contigua y no se puede reutilizar;
- un fallo SHALL dar siempre el mismo mensaje, sin decir qué falló;
- la petición SHALL traer el `Origin` exacto.

#### Scenario: Contraseña buena y código malo
- **WHEN** se entra con la contraseña correcta y un código incorrecto
- **THEN** responde 401 con el mismo mensaje que con la contraseña mal

#### Scenario: Código reutilizado
- **WHEN** se repite un código que ya sirvió para entrar
- **THEN** responde 401

#### Scenario: Origen ajeno
- **WHEN** la petición de entrada llega con otro `Origin`
- **THEN** responde 403 sin comprobar nada

### Requirement: Los intentos de entrada están limitados
El Taller SHALL admitir como mucho 5 intentos fallidos por IP cada 15 minutos. Pasado el
límite, SHALL responder 429 con `Retry-After`, aunque la clave sea buena.

#### Scenario: Sexto intento
- **WHEN** una IP falla 5 veces y lo intenta una sexta con la clave buena
- **THEN** responde 429 y no entra

### Requirement: La sesión del Taller es corta y se renueva al entrar
Al entrar, la sesión SHALL rotarse y el permiso de Taller SHALL caducar a las 8 horas.
Salir SHALL quitar el permiso sin perder el carrito. Las respuestas del Taller SHALL ir con
`Cache-Control: no-store`.

#### Scenario: Permiso caducado
- **WHEN** han pasado 8 horas desde la entrada
- **THEN** las rutas del Taller responden 401 `TALLER_AUTH_REQUIRED`

#### Scenario: Salir
- **WHEN** se sale del Taller con un carrito abierto
- **THEN** el permiso desaparece y el carrito sigue

### Requirement: Cada operación del Taller exige el permiso
Toda ruta del Taller, salvo la entrada, SHALL exigir el permiso vigente. Sin él SHALL
responder 401 `TALLER_AUTH_REQUIRED`. Las que cambian algo SHALL exigir además el `Origin`
exacto.

#### Scenario: Sin permiso
- **WHEN** se pide la lista de drops del Taller sin haber entrado
- **THEN** responde 401 y no consulta Shopify

### Requirement: El Taller crea y edita drops
El Taller SHALL crear drops en borrador con título, número y slug, que da la colección
`rocky-drop-<slug>`. SHALL editar sus textos, fechas y cartel, con la validación del
calendario. El slug SHALL NOT cambiar después de crear el drop.

#### Scenario: Drop nuevo
- **WHEN** se crea el drop «ROCKY DROP 7» con número 7 y slug `7`
- **THEN** existe la colección `rocky-drop-7` en borrador y no aparece en la web pública

#### Scenario: Fechas incoherentes
- **WHEN** se edita un drop con el cierre antes del lanzamiento
- **THEN** responde 400 `DROP_INVALID` y no cambia nada en Shopify

### Requirement: El Taller programa y despublica drops
Programar SHALL pasar el drop a `programado` y publicar sus diseños en el canal Headless con
la fecha de lanzamiento. Programar sin diseños SHALL rechazarse. Volver a borrador SHALL
despublicarlos de ese canal y sacarlo de la web pública.

#### Scenario: Programar
- **WHEN** se programa un drop con 3 diseños para mañana
- **THEN** la web lo anuncia con 3 siluetas y Shopify tiene los 3 diseños programados para esa hora

#### Scenario: Programar vacío
- **WHEN** se programa un drop sin diseños
- **THEN** responde 409 `DROP_EMPTY`

### Requirement: El Taller crea y edita diseños completos
El Taller SHALL crear un diseño dentro de un drop con:
- título (hasta 80 caracteres) y descripción (hasta 1000);
- precio de 1 a 999 €;
- tallas S, M, L y XL, cada una con existencias de 0 a 999 o sin límite;
- una foto.

SHALL editar después esos datos, añadir un producto existente que no esté en otro drop y
quitar un diseño del drop.

#### Scenario: Diseño nuevo
- **WHEN** se crea «El Jefe» a 34,99 € con foto y M con 3 unidades
- **THEN** existe el producto en Shopify, está en la colección del drop y su talla M tiene 3 unidades

#### Scenario: Producto de otro drop
- **WHEN** se intenta añadir a un drop un producto que ya está en otro drop
- **THEN** responde 409 `DESIGN_IN_OTHER_DROP`

### Requirement: Las imágenes se validan antes de subirlas
El Taller SHALL aceptar imágenes PNG, JPEG o WebP de hasta 8 MB, identificadas por su
contenido y no por el nombre o el tipo declarado. Las SHALL subir a Shopify por subida
segura. Cualquier otro fichero SHALL rechazarse con 415 o 413.

#### Scenario: Fichero disfrazado
- **WHEN** se sube un HTML con tipo `image/png`
- **THEN** responde 415 y no se sube nada

#### Scenario: Imagen grande
- **WHEN** se sube un PNG de 12 MB
- **THEN** responde 413

### Requirement: El Taller enseña la vista previa y los avisos
Para cada drop, el Taller SHALL enseñar su cartel tal como se verá en cada estado. SHALL
indicar cuántos avisos tiene apuntados, sumando los del drop y los de sus diseños, sin
mostrar ningún email.

#### Scenario: Vista previa de un borrador
- **WHEN** se abre un drop en borrador en el Taller
- **THEN** se ve su cartel en anunciado, en la calle y archivo sin que la web pública lo muestre

### Requirement: Cada acción del Taller queda registrada
Cada operación del Taller que cambia algo SHALL registrar en el log la acción, el drop o
diseño afectado y el resultado. SHALL NOT registrar contraseñas, códigos, cookies, emails ni
cuerpos de petición. Las entradas fallidas SHALL registrarse sin la clave.

#### Scenario: Programar un drop
- **WHEN** se programa el Drop 6
- **THEN** el log tiene una línea con la acción `programar`, `rocky-drop-6` y `ok`, sin datos personales
