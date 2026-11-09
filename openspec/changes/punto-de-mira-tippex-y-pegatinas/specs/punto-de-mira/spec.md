# Spec Delta

## Purpose

Que la foto de producto responda como un punto de mira: apunta al pasar o enfocar y marca
el impacto al añadir al carrito.

## ADDED Requirements

### Requirement: La foto de producto muestra un punto de mira al apuntarla
En las tarjetas del catálogo y en la ficha, la foto de producto SHALL mostrar una retícula
dibujada (aro, cuatro marcas y punto central) que enmarca el estampado y se cierra sobre
la foto al pasar el puntero o al recibir el foco de teclado, y SHALL ocultarla al salir.
De noche SHALL usar la tinta y el acento del modo neón.

#### Scenario: Apuntar con el puntero
- **WHEN** el puntero pasa sobre la foto de una tarjeta
- **THEN** la retícula aparece y se cierra sobre la foto

#### Scenario: Salir
- **WHEN** el puntero sale de la foto
- **THEN** la retícula se oculta

### Requirement: La mira es decorativa y no tapa el foco
La retícula SHALL ser decorativa (oculta a los lectores de pantalla) y SHALL NOT sustituir
el anillo de foco de la web, que SHALL verse entero dentro de la tarjeta.

#### Scenario: Apuntar con el teclado
- **WHEN** la foto recibe el foco con Tab
- **THEN** la retícula aparece y el anillo de foco rojo se ve entero, sin recortes de la tarjeta

#### Scenario: Decorativa
- **WHEN** un lector de pantalla recorre la tarjeta
- **THEN** la retícula no se anuncia y la foto conserva su nombre «Ver <producto> en grande»

### Requirement: El trazo de la mira es de rotulador en cualquier tamaño
El trazo de la retícula SHALL tener el mismo grosor sea cual sea el tamaño de la foto, y
en la ficha la retícula SHALL tener un tamaño acotado en vez de crecer con la foto.

#### Scenario: Ficha grande
- **WHEN** la ficha muestra la foto a 900 px
- **THEN** la retícula mide como mucho 360 px y su trazo es tan fino como en las tarjetas

### Requirement: Los agotados no llevan mira
Los productos agotados SHALL NOT llevar retícula: no se apunta a lo que no se puede
comprar.

#### Scenario: Agotado
- **WHEN** el puntero pasa sobre la foto de un producto agotado
- **THEN** no aparece ninguna retícula

### Requirement: Añadir al carrito marca un impacto en la foto
Cuando un añadido al carrito sale bien desde una tarjeta o desde la ficha, la retícula de
esa foto SHALL cerrarse y desaparecer y SHALL quedar una pegatina de diana de tamaño fijo
mientras el botón muestra «Añadido ✓». Un añadido fallido SHALL NOT mostrar el impacto.
Con movimiento reducido, el impacto SHALL aparecer sin animación.

#### Scenario: Añadido con éxito
- **WHEN** se pulsa «Añadir al carrito» en una tarjeta y el carrito confirma el añadido
- **THEN** la retícula de esa tarjeta, y solo la de esa, se cierra y se va, y queda la pegatina mientras dura «Añadido ✓»

#### Scenario: Añadido fallido
- **WHEN** el carrito rechaza el añadido
- **THEN** no aparece la pegatina y se ve el error de siempre

#### Scenario: Movimiento reducido
- **WHEN** con movimiento reducido el carrito confirma un añadido
- **THEN** la pegatina aparece sin animación

### Requirement: La pegatina del impacto no choca con el arte de la ficha
La pegatina del impacto SHALL ir en la esquina superior derecha de la foto en las tarjetas
y en la inferior izquierda en la ficha, donde no la tapa el muñeco sentado en el marco.

#### Scenario: Añadido desde la ficha
- **WHEN** se añade al carrito desde la ficha
- **THEN** la pegatina aparece abajo a la izquierda de la foto, sin cruzarse con el muñeco del marco
