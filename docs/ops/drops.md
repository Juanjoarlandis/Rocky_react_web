# Drops y El Taller

Cómo se programan, configuran, editan y publican los drops de ROCKY 035, y cómo se
pone en marcha El Taller en un servidor. Especificación:
`openspec/changes/sistema-de-drops/` (capacidades `calendario-de-drops`,
`venta-de-drops`, `catalogo-vivo`, `taller-de-drops`, `muro-de-drops` y
`avisos-de-drop`).

## Qué es un drop

Un drop es una **colección de Shopify** con:

- el handle `rocky-drop-<slug>` (por ejemplo `rocky-drop-6`);
- el metacampo JSON `rocky.drop`:
  `{ version, number, tagline, story, launchAt, endsAt, status }`, con
  `status` `borrador` o `programado`;
- la **imagen de la colección** como cartel;
- sus **productos** como diseños. Un diseño solo puede estar en un drop.

El estado público sale de las fechas, con la hora del servidor:

| Estado | Cuándo | Qué se ve |
| --- | --- | --- |
| borrador | `status: borrador` | Nada en la web pública |
| anunciado | antes del lanzamiento | Teaser: cartel precintado, fecha, cuenta atrás, siluetas y pestañas de aviso. Sin nombres, fotos ni precios, y no se vende |
| en la calle | lanzado; sin cierre o con más de 48 h por delante | Diseños a la venta |
| últimas horas | dentro de las 48 h previas al cierre | Igual, con la esquina despegada y «quedan N h» |
| archivo | pasado el cierre, o sin cierre y todo agotado | Se ve y se puede abrir, pero no se vende («Drop cerrado») |

Nadie tiene que hacer nada a la hora:

- **Shopify** publica los diseños en el canal Headless a la hora de lanzamiento (publicación programada).
- **El BFF** no vende nada que no esté en la calle: devuelve 409 `DROP_NOT_ON_SALE` al añadir al carrito y `DROP_CLOSED_IN_CART` al pagar.
- **La web** cambia el cartel al llegar a cero y recarga el catálogo.

## El Taller (`/taller`)

Se entra con **clave y código de la app** (TOTP). La sesión dura 8 horas, y hay 5
intentos por IP cada 15 minutos (una IPv6 cuenta por su /64). No hay enlace en la
barra: se entra escribiendo la dirección.

Si alguien mete **diez códigos malos con la clave buena** en una hora, la entrada
se cierra una hora para todos y el log lo marca como error («Entrada al Taller
cerrada…»). Eso quiere decir que la clave se ha filtrado: genera otra con
`npm run taller:clave`, cámbiala en el entorno y reinicia.

Si el permiso caduca (8 h o servidor reiniciado), el Taller vuelve solo a la
entrada.

- **Nuevo drop**: título, número y slug. Nace en borrador y no aparece en la web.
- **Editar**:
  - lema, historia, lanzamiento y cierre, en **hora de Madrid**. Sin cierre, sigue en la calle hasta agotarse;
  - el cartel: PNG, JPEG o WebP de hasta 8 MB. Sube al guardar.
- **Vista previa**: el cartel tal como saldrá anunciado, en la calle, en últimas horas y en archivo. Es solo para mirar: sus pestañas y enlaces no hacen nada.
- **Diseños**:
  - crear uno completo: título, descripción, precio, tallas S/M/L/XL con unidades o sin límite, y foto;
  - editarlo;
  - añadir un producto que ya exista, si no está en otro drop;
  - quitarlo del drop. Quitar un diseño lo saca también de la venta.
- **Programar el drop**: lo publica en el canal Headless con la fecha de lanzamiento, y lo saca de los demás canales. Un drop sin diseños, sin fecha o con cambios sin guardar no se programa.
- **Despublicar** (dos pulsaciones): vuelve a borrador y saca sus diseños de todos los canales.
- Si Shopify falla a medias al programar, despublicar o mover la fecha, el Taller enseña el error y basta con repetir la acción: la fecha y el estado guardados no cambian hasta que Shopify ha terminado.
- Cada drop dice **cuántos avisos tiene apuntados**: los suyos más los de sus diseños, sin repetir. Nunca enseña los emails.

Cada cambio deja una línea en el log del servidor (`Taller`, acción, objetivo y
resultado), sin cuerpos ni datos personales.

## Avisos

El formulario de las pestañas del cartel apunta a la lista del drop. El envío
sigue siendo un script (el servidor web no manda correos):

```bash
npm run avisos:enviar -- --drop rocky-drop-6          # simulacro
npm run avisos:enviar -- --drop rocky-drop-6 --apply  # envía y borra las listas
```

**Con `--apply`, el servidor tiene que estar parado.** El script escribe en el mismo
fichero cifrado que el servidor, y el servidor guarda su estado en memoria: no vuelve a
leer el disco, así que su siguiente volcado desharía las marcas y los borrados del
script (y se volvería a escribir a los mismos correos la próxima vez). El simulacro,
sin `--apply`, solo lee y se puede lanzar con el servidor en marcha. Para lanzarlo en
la Raspberry: `docker stop rocky035`, ejecutar el script en un contenedor aparte con el
mismo volumen y fichero de entorno, y `docker start rocky035`.

El script junta la lista del drop con las de sus diseños, quita repetidos, manda un
correo por persona con el título del drop y enlaza a `/products/rocky-drop-6`.

## Puesta en marcha en un servidor

1. **Shopify** (lo hace quien administra la tienda):
   1. En la app de la tienda (Dev Dashboard), revisa que tiene los alcances:
      - `read_products`, `write_products`;
      - `read_publications`, `write_publications`;
      - `write_files`;
      - `read_inventory`, `write_inventory`.
   2. Anota el id de la publicación del canal Headless (`gid://shopify/Publication/<n>`). Se puede leer con la Admin API: `publications { nodes { id name } }`.
2. **Clave del Taller**: `npm run taller:clave`. Guarda la clave en el gestor de contraseñas y da de alta el código en la app (con la URI `otpauth://` o con el secreto a mano).
3. **Entorno del servidor**:
   - `SHOPIFY_HEADLESS_PUBLICATION_ID`;
   - `TALLER_PASSWORD_HASH`;
   - `TALLER_TOTP_SECRET`;
   - las credenciales Admin que ya existen (`SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`).

   Sin alguna de ellas, El Taller queda apagado (`/api/taller/*` → 404) y el arranque dice qué falta. La web sigue funcionando.
4. **Publicar** la release con `docs/ops/publicar.md`.
5. **Revisar los canales.** En el admin de Shopify, los productos que vayan a ir en drops deben estar solo en el canal Headless. En otro canal (tienda online, Shop app…) se podrían ver o comprar sin pasar por la web, saltándose la fecha y el cierre. El Taller los saca de los demás canales al programar, despublicar o quitar un diseño. Con un producto que se añada a un drop ya programado, también.
6. **Crear en el Taller el drop en curso** con sus productos. Hasta entonces la web no tiene drops: los productos salen como «Tienda» y se venden con sus reglas de siempre.

   Si ya existe una colección `rocky-drop-N` de antes, el Taller no deja crear otra con ese slug (Shopify le pondría un sufijo). Hay dos opciones:
   - elegir otro slug;
   - **adoptarla**: en Shopify, en *Ajustes → Datos personalizados → Colecciones*, define el metacampo `rocky.drop` de tipo JSON y rellénalo en la colección con, por ejemplo:

     ```json
     {"version":1,"number":4,"tagline":"","story":"","launchAt":null,"endsAt":null,"status":"borrador"}
     ```

     Desde ese momento es un drop en borrador: sus productos dejan de verse en la web hasta que se programe. Hazlo justo antes de editarlo y programarlo en el Taller.

## Riesgos aceptados

- Quien ya abrió el pago de Shopify con el drop en la calle puede terminarlo después del cierre, como en una tienda que cierra con gente en la caja. Después del cierre no se puede añadir ni pedir el pago.
- Si el servidor arranca con la Admin API caída, la web no tiene drops hasta que vuelva y los diseños del archivo se pueden comprar mientras tanto. Queda en el log («No se han podido leer los drops de Shopify»). Si cae con el servidor ya en marcha, se sigue con la última lectura buena.

## Vuelta atrás

- `npm run release:revertir` vuelve a la release anterior.
- Los metacampos y la imagen de colección no molestan al código viejo (que toma la primera colección como drop).
- Las publicaciones programadas siguen en Shopify. Con el código viejo, un drop anunciado no aparece hasta su hora, y eso es aceptable.

## Tienda de pruebas

`scripts/drops-semilla.mjs` siembra los 4 drops de `rocky035-pruebas`: archivo,
últimas horas, en la calle y anunciado para el jueves siguiente a las 20:00.
Escribe sus metacampos, sube los carteles de `assets-master/carteles-prueba/` y
deja publicado cada diseño según su estado. Se niega con cualquier otra tienda.

```bash
node scripts/drops-semilla.mjs            # simulacro
node scripts/drops-semilla.mjs --aplicar
```
