# Spec Delta

## Purpose

Que la foto de producto responda como un punto de mira: apunta al pasar o enfocar y marca
el impacto al añadir al carrito.

## ADDED Requirements

### Requirement: En táctil, la mira barre el catálogo al hacer scroll
En pantallas sin hover, con movimiento sin reducir y en navegadores con animaciones ligadas
al scroll, la retícula de cada tarjeta del catálogo SHALL cerrarse sobre la foto mientras la
tarjeta cruza la zona central de la pantalla y SHALL abrirse y desaparecer al alejarse. Un
producto agotado SHALL NOT mostrar la retícula.

#### Scenario: Bajar por el catálogo en el móvil
- **WHEN** en un móvil se baja por el catálogo
- **THEN** la retícula se cierra sobre la foto de la tarjeta que pasa por el centro y se abre en las que se alejan

#### Scenario: Producto agotado
- **WHEN** una tarjeta agotada pasa por el centro de la pantalla
- **THEN** no aparece la retícula y se ve la pegatina arrancada, como hoy

#### Scenario: Navegador sin animaciones ligadas al scroll
- **WHEN** el navegador no admite animaciones ligadas al scroll
- **THEN** el catálogo táctil se ve como hoy, sin retícula y sin fallos

#### Scenario: Movimiento reducido
- **WHEN** alguien con movimiento reducido baja por el catálogo en el móvil
- **THEN** la retícula no aparece al hacer scroll

### Requirement: El impacto al añadir sigue mandando
El barrido de la retícula SHALL NOT tapar ni cortar el impacto al añadir al carrito: al
añadir un producto, la mira SHALL cerrarse, disparar y dejar la pegatina del impacto como
hoy, también en táctil.

#### Scenario: Añadir desde el móvil
- **WHEN** en el móvil se añade al carrito un producto cuya tarjeta está en el centro
- **THEN** se ve el disparo de la mira y la pegatina del impacto mientras el botón dice «Añadido ✓»
