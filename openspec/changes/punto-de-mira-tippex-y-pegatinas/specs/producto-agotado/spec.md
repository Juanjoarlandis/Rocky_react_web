# Spec Delta

## Purpose

Que un producto agotado se reconozca de un vistazo en el catálogo, con el lenguaje de la
calle: una pegatina medio arrancada.

## ADDED Requirements

### Requirement: Un producto agotado se ve como una pegatina arrancada
En las tarjetas del catálogo, un producto en estado agotado SHALL mostrar su foto
parcialmente tapada por un resto de papel con borde roto, de modo que siga viéndose una
parte reconocible del producto. La tarjeta SHALL llevar la clase de estado `is-sold-out` y
SHALL NOT levantarse al pasar el puntero. El resto de estados SHALL NOT mostrar el papel
roto.

#### Scenario: Agotado
- **WHEN** el catálogo muestra un producto cuya variante no está a la venta
- **THEN** su foto aparece medio arrancada y el botón dice «Agotado»

#### Scenario: Disponible
- **WHEN** el catálogo muestra un producto que se puede comprar
- **THEN** su foto se ve entera, sin papel roto

### Requirement: El rótulo del agotado es legible y no grita
El rótulo «Agotado» del papel SHALL tener contraste AA sobre el papel y SHALL NOT ser más
llamativo que el nombre del producto.

#### Scenario: Parrilla con agotados
- **WHEN** la parrilla muestra disponibles y agotados
- **THEN** el rótulo es más pequeño que el nombre del producto y su color cumple AA de día y de noche

### Requirement: Los agotados no se repiten
Cada agotado SHALL llevar el desgarro normal o en espejo según el propio producto, siempre
el mismo para ese producto, de modo que una parrilla de agotados mezcle las dos variantes
y no sea un muro de pegatinas idénticas, tampoco en una columna de móvil.

#### Scenario: Dos agotados distintos
- **WHEN** la parrilla muestra dos agotados a los que les toca variante distinta
- **THEN** sus desgarros van en sentidos opuestos y el rótulo cambia de lado

#### Scenario: El mismo producto
- **WHEN** un agotado se vuelve a pintar (otra visita, otra página del catálogo)
- **THEN** lleva la misma variante que antes

### Requirement: La foto del agotado se puede ver entera
La foto de un producto agotado SHALL seguir abriendo el lightbox con la imagen completa y
SHALL conservar su nombre accesible. El papel roto SHALL ser decorativo.

#### Scenario: Ver el agotado en grande
- **WHEN** se pulsa la foto de un producto agotado
- **THEN** el lightbox muestra la foto completa
