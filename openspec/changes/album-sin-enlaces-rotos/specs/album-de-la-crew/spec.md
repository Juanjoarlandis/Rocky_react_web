## ADDED Requirements

### Requirement: Ningún cromo enlaza a una ficha escrita a mano
El «Visto en» de un cromo SHALL NOT apuntar a la ficha de un producto concreto
(`/product/<handle>`) escrita en los datos del álbum, porque los productos cambian con cada drop y
con la tienda. Un cromo que vive en las fichas SHALL decir que vive en cualquier ficha.

#### Scenario: Los datos del álbum
- **WHEN** se recorren los «Visto en» de todos los cromos de `src/data/crew.js`
- **THEN** ninguno empieza por `/product/`, y El Vigía y El Nube viven en cualquier ficha

### Requirement: «Las fichas de producto» abre una ficha que existe
Cuando el catálogo cargado tiene productos, el enlace de un cromo que vive en cualquier ficha SHALL
llevar a la ficha del primer producto del catálogo.

#### Scenario: Con catálogo
- **WHEN** el catálogo cargado empieza por `rocky-ya-llego` y se gira el cromo de El Vigía
- **THEN** «Las fichas de producto →» lleva a `/product/rocky-ya-llego`

#### Scenario: Un handle con caracteres raros
- **WHEN** el primer producto tiene un handle con un carácter que no va tal cual en una URL
- **THEN** el enlace lo codifica, igual que el resto de enlaces a fichas

### Requirement: Sin catálogo, el enlace lleva a la tienda
Mientras el catálogo no ha llegado, o si llega vacío, el enlace de un cromo que vive en cualquier
ficha SHALL llevar a la tienda (`/`) y SHALL NOT llevar a una ficha que no existe.

#### Scenario: Catálogo vacío o sin cargar
- **WHEN** no hay productos y se gira el cromo de El Nube
- **THEN** «Las fichas de producto →» lleva a `/`

### Requirement: El resto de enlaces del álbum no cambia
Los cromos que no viven en cualquier ficha SHALL conservar su enlace tal cual, también los que
llevan a una categoría.

#### Scenario: El Recadero y El Portero
- **WHEN** se giran los cromos de El Recadero y de El Portero, con o sin catálogo
- **THEN** llevan a `/products/agotado` y a `/rockyIA`, como antes
