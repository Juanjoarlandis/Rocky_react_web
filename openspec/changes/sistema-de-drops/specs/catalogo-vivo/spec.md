# Spec Delta

## Purpose

Que la tienda enseñe todo lo que está publicado, cada diseño en su drop y con su ficha, y
que de un drop anunciado no llegue al navegador nada más que lo que dice su teaser.

## ADDED Requirements

### Requirement: El catálogo está completo
El catálogo público SHALL incluir todos los productos publicados en el canal Headless, hasta
250, paginando en el servidor. La web SHALL NOT limitarse a los 8 más recientes.

#### Scenario: Tienda con 20 diseños publicados
- **WHEN** la tienda tiene 20 productos publicados y ninguno es de un drop anunciado
- **THEN** la portada, el muro y las páginas de drop cuentan y enseñan los 20

### Requirement: Cada diseño pertenece al drop que dice el modelo
El drop de un diseño SHALL ser la colección de drop en la que está, no su primera
colección. Las demás colecciones SHALL ignorarse para esto. Si un diseño está en dos
colecciones de drop, SHALL contar en la de lanzamiento más reciente y el servidor SHALL
registrarlo.

#### Scenario: Diseño también en la colección de portada
- **WHEN** un diseño está en `frontpage` y en `rocky-drop-5`
- **THEN** su drop es el Drop 5

#### Scenario: Diseño sin drop
- **WHEN** un diseño publicado no está en ninguna colección de drop
- **THEN** sale en el catálogo sin drop, como «Tienda»

### Requirement: Del drop anunciado solo sale el teaser
Para un drop anunciado, ninguna respuesta pública SHALL incluir títulos, handles,
descripciones, imágenes, precios ni variantes de sus diseños. Solo SHALL incluir su número de
diseños.

#### Scenario: Respuestas del catálogo y de los drops
- **WHEN** el Drop 6 está anunciado con 5 diseños
- **THEN** `/api/drops` y `/api/shopify/products` no contienen ningún nombre ni imagen de esos 5 y el Drop 6 dice `designCount: 5`

### Requirement: Todo lo publicado tiene ficha
Cada producto publicado SHALL tener ficha accesible por su URL directa, aunque no esté entre
los primeros productos cargados. La ficha SHALL incluir los diseños de drops en archivo.

#### Scenario: Ficha directa de un diseño antiguo
- **WHEN** se abre por URL la ficha de un diseño del Drop 3
- **THEN** se ve la ficha, con su drop y su estado

### Requirement: La tarjeta y la ficha dicen si el drop ya voló
Un diseño de un drop en archivo SHALL mostrarse sin botón de compra y con el aviso de que el
drop ya cerró. Uno agotado de un drop a la venta SHALL seguir mostrándose como agotado,
con la pegatina arrancada.

#### Scenario: Ficha de un drop cerrado
- **WHEN** se abre la ficha de un diseño de un drop en archivo
- **THEN** no hay «Añadir al carrito» y se lee que el drop ya voló

#### Scenario: Agotado en un drop a la venta
- **WHEN** un diseño agotado pertenece a un drop en la calle
- **THEN** su tarjeta lleva la pegatina arrancada y el botón «Agotado»

### Requirement: Sin Shopify hay muro de demostración
En modo demo, sin tienda configurada, la web SHALL enseñar drops de demostración que
cubran los estados anunciado, en la calle y archivo, sin permitir pagos.

#### Scenario: Modo demo
- **WHEN** la web arranca sin tienda Shopify
- **THEN** el muro enseña carteles de demostración en los tres estados y el aviso de modo demo
