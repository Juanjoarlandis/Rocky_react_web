# Spec Delta

## Purpose

Que la foto de producto responda como un punto de mira: apunta al pasar o enfocar y marca
el impacto al añadir al carrito.

## ADDED Requirements

### Requirement: La foto de producto muestra un punto de mira al apuntarla
En las tarjetas del catálogo y en la ficha, la foto de producto SHALL mostrar una retícula
dibujada (aro, cuatro marcas y punto central) que se cierra sobre la foto al pasar el
puntero o al recibir el foco de teclado, y SHALL ocultarla al salir. La retícula SHALL ser
decorativa (oculta a los lectores de pantalla) y SHALL NOT sustituir el anillo de foco de
la web. De noche SHALL usar la tinta y el acento del modo neón.

#### Scenario: Apuntar con el puntero
- **WHEN** el puntero pasa sobre la foto de una tarjeta
- **THEN** la retícula aparece y se cierra sobre la foto

#### Scenario: Apuntar con el teclado
- **WHEN** la foto recibe el foco con Tab
- **THEN** la retícula aparece y el anillo de foco rojo sigue visible

#### Scenario: Decorativa
- **WHEN** un lector de pantalla recorre la tarjeta
- **THEN** la retícula no se anuncia y la foto conserva su nombre «Ver <producto> en grande»

### Requirement: Añadir al carrito marca un impacto en la foto
Cuando un añadido al carrito sale bien desde una tarjeta o desde la ficha, la foto de ese
producto SHALL mostrar el impacto (la retícula cerrada y un punto rojo de pegatina en su
esquina superior derecha) mientras el botón muestra «Añadido ✓». Un añadido fallido SHALL
NOT mostrar el impacto. Con movimiento reducido, el impacto SHALL aparecer sin animación.

#### Scenario: Añadido con éxito
- **WHEN** se pulsa «Añadir al carrito» en una tarjeta y el carrito confirma el añadido
- **THEN** la foto de esa tarjeta, y solo la de esa, muestra el punto rojo mientras dura «Añadido ✓»

#### Scenario: Añadido fallido
- **WHEN** el carrito rechaza el añadido
- **THEN** no aparece el punto rojo y se ve el error de siempre
