# Proposal

## Why

En el álbum de la crew (`/crew`), el reverso de cada cromo dice dónde se ve a ese muñeco y lo
enlaza. El Vigía y El Nube viven en las fichas de producto (los dos están dibujados en todas,
en `ProductDetail.jsx`), pero su «Visto en: Las fichas de producto →» apunta a una ficha
concreta, `/product/rockyracing`. Esa camiseta era del Drop 4 de la vista previa y ya no existe
en la tienda: el 12-nov, contra la tienda de pruebas que usa producción, el enlace abre
«Producto no encontrado».

Cualquier ficha escrita a mano en `src/data/crew.js` vuelve a caducar con el siguiente drop o al
pasar a la tienda real, así que el arreglo no es cambiar un handle por otro.

El usuario eligió este arreglo el 12-nov, tras cerrar las tres ideas de dirección artística
(«Enlaces rotos del álbum»).

## What Changes

- **«Las fichas de producto» abre una ficha que existe.** El cromo no guarda ningún handle: dice
  que vive en «cualquier ficha», y el álbum la elige al pintarse, la primera del catálogo
  que la web ya ha cargado.
- **Sin catálogo, a la tienda.** Mientras el catálogo no ha llegado, o si viene vacío, el enlace
  lleva a la tienda (`/`), donde se abren las fichas; nunca a una ficha inventada.
- **El resto de enlaces del álbum no cambia.** «Las categorías vacías» (`/products/agotado`) es a
  propósito: El Recadero vive en la página «Nada por aquí».
- **El mapa de Lacoma no cambia.** Los dos cromos siguen contando en «Los bancos de La Salle»,
  que abre la tienda.

## Capabilities

### New Capabilities
- `album-de-la-crew`: adónde lleva el «Visto en» de cada cromo del álbum.

### Modified Capabilities
<!-- Ninguna: no hay especificaciones archivadas del álbum. -->

## Impact

- `src/data/crew.js`: El Vigía y El Nube dejan el handle y pasan a `to: '/'` con
  `anyProductPage: true`.
- `src/features/crew/vistoEn.js` (nuevo, con su prueba): de un «Visto en» y el catálogo a la
  ruta del enlace.
- `src/features/crew/Crew.jsx`: recibe `products` y resuelve el enlace de cada cromo.
- `src/App.jsx`: pasa `commerce.products` al álbum. Es la única línea en el JavaScript inicial,
  que está en 99,95 de 100 kB: se mide en el build.
- No cambia el servidor, ni Shopify, ni las imágenes, ni el CSS.

## Supuestos

- **La ficha elegida es la primera del catálogo.** El Vigía y El Nube salen en todas, así que
  cualquiera vale, y la primera da un enlace estable mientras el catálogo no cambie. No tiene por
  qué ser la primera tarjeta de la tienda, que ordena por drops.
- **En el modo demo, sin Shopify, puede ser una ficha bajo llave.** El primer producto del
  catálogo demo es de un drop anunciado, que la tienda esconde. Con Shopify no pasa: el servidor
  no manda los diseños de un drop anunciado. Esa ficha ya se abría por su URL antes de este cambio,
  así que no se pasa la lista de drops al álbum para evitarlo.
