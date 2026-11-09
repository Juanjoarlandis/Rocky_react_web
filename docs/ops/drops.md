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
intentos por IP cada 15 minutos. No hay enlace en la barra: se entra escribiendo
la dirección.

- **Nuevo drop**: título, número y slug. Nace en borrador y no aparece en la web.
- **Editar**:
  - lema, historia, lanzamiento y cierre, en **hora de Madrid**. Sin cierre, sigue en la calle hasta agotarse;
  - el cartel: PNG, JPEG o WebP de hasta 8 MB. Sube al guardar.
- **Vista previa**: el cartel tal como saldrá anunciado, en la calle y en archivo.
- **Diseños**:
  - crear uno completo: título, descripción, precio, tallas S/M/L/XL con unidades o sin límite, y foto;
  - editarlo;
  - añadir un producto que ya exista, si no está en otro drop;
  - quitarlo del drop. Quitar un diseño lo saca también de la venta.
- **Programar el drop**: lo publica en el canal Headless con la fecha de lanzamiento. Un drop sin diseños o sin fecha no se programa.
- **Despublicar** (dos pulsaciones): vuelve a borrador y saca sus diseños del canal.
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
5. **Crear en el Taller el drop en curso** con sus productos, o escribir su metacampo. Hasta entonces la web no tiene drops: los productos salen como «Tienda» y se venden con sus reglas de siempre.

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
