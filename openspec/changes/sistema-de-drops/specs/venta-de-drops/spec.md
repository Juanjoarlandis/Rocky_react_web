# Spec Delta

## Purpose

Garantizar que solo se vende lo que está en la calle: un diseño de un drop anunciado, en
borrador o en archivo no se puede añadir al carrito ni pagar, y eso lo impone el servidor y
Shopify, no el navegador.

## ADDED Requirements

### Requirement: Solo se añade al carrito lo que está a la venta
Añadir al carrito una variante de un diseño cuyo drop no esté `en-la-calle` ni en
`ultimas-horas` SHALL rechazarse con 409 y código `DROP_NOT_ON_SALE`, con un mensaje en
castellano. Los productos que no pertenecen a ningún drop SHALL seguir las reglas de
siempre.

#### Scenario: Diseño de un drop en archivo
- **WHEN** se añade una variante de un diseño cuyo drop ya cerró
- **THEN** responde 409 con `DROP_NOT_ON_SALE` y el carrito no cambia

#### Scenario: Diseño de un drop en la calle
- **WHEN** se añade una variante disponible de un drop en la calle
- **THEN** se añade como hasta ahora

#### Scenario: Producto sin drop
- **WHEN** se añade un producto que no está en ninguna colección de drop
- **THEN** se añade como hasta ahora

### Requirement: Tampoco se sube la cantidad de lo que ya no se vende
Aumentar la cantidad de una línea cuyo diseño pertenece a un drop que no está a la venta
SHALL rechazarse con `DROP_NOT_ON_SALE`. Reducirla o quitar la línea SHALL seguir
permitido.

#### Scenario: Subir y bajar cantidad tras el cierre
- **WHEN** tras el cierre del drop se pide pasar una línea de 1 a 2 y después de 1 a 0
- **THEN** lo primero responde 409 y lo segundo quita la línea

### Requirement: El pago se para si hay líneas de drops cerrados
Iniciar el pago con alguna línea de un drop que no está a la venta SHALL responder 409 con
el código `DROP_CLOSED_IN_CART` y los títulos afectados, sin devolver la URL de pago.

#### Scenario: Carrito con un diseño de un drop cerrado
- **WHEN** se pide el checkout con una línea del Drop 4 ya cerrado
- **THEN** responde 409, nombra el diseño y no hay `checkoutUrl`

### Requirement: Shopify no sirve un drop antes de su hora
Al programar un drop, sus diseños SHALL publicarse en el canal Headless con la fecha de
lanzamiento como fecha de publicación. El Taller SHALL NOT publicarlos en otros canales. Al
volver un drop a borrador, sus diseños SHALL despublicarse del canal Headless.

#### Scenario: Drop programado
- **WHEN** el Drop 6 queda programado para el viernes a las 20:00
- **THEN** la Storefront API no devuelve sus diseños antes de esa hora y sí después

#### Scenario: Vuelta a borrador
- **WHEN** un drop programado vuelve a borrador
- **THEN** sus diseños dejan de estar publicados en el canal Headless

### Requirement: El navegador no decide la venta
La interfaz SHALL desactivar la compra según el estado del drop, pero la venta SHALL NOT
depender de ello: una petición fabricada a mano SHALL recibir el mismo rechazo.

#### Scenario: Petición a mano
- **WHEN** alguien envía un POST al carrito con la variante de un diseño anunciado o archivado
- **THEN** recibe el rechazo del servidor o de Shopify, nunca un carrito con esa línea
