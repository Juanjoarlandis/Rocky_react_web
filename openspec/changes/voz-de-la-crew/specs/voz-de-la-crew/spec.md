# Spec Delta

## Purpose

Que la ficha de un producto la cuente el muñeco que lleva estampado: su texto, su firma con
su cabeza y su grito al añadirlo al carrito, sin tocar los productos que no firma nadie.

## ADDED Requirements

### Requirement: Una descripción firmada por la crew se firma en la ficha
Cuando la descripción de un producto termina en una raya seguida del nombre exacto de un
miembro de la crew, la ficha SHALL enseñar el texto sin esa firma y, debajo, la firma: la
cabeza del muñeco como decoración y su nombre seguido de «de la crew». El guion corto SHALL
firmar solo detrás de un final de frase.

#### Scenario: Ficha firmada
- **WHEN** la descripción de «Ya llegó» es «No la suelto ni en la lavadora. — El Paquetes»
- **THEN** la ficha enseña «No la suelto ni en la lavadora.» y debajo la firma de El Paquetes con su cabeza

#### Scenario: La firma pegada al texto
- **WHEN** la descripción llega de Shopify en una sola línea, sin espacio antes de la raya («…lavadora.—El Paquetes»)
- **THEN** la ficha la firma igual

#### Scenario: Un guion en el nombre de un producto
- **WHEN** la descripción termina en «colección ROCKY 035 - Rocky»
- **THEN** no hay firma y el texto se ve entero, porque el guion no va tras un final de frase

### Requirement: Sin firma de la crew, la ficha no cambia
Un producto sin firma, con una firma que no es el nombre de un miembro de la crew o con la
firma en mitad del texto SHALL verse exactamente igual que hoy, sin cabeza ni grito.

#### Scenario: Producto de la tienda real sin firmar
- **WHEN** la descripción es «Camiseta negra.»
- **THEN** la ficha enseña «Camiseta negra.» como hoy y no hay firma

#### Scenario: Un nombre que no es de la crew
- **WHEN** la descripción termina en «— Juan»
- **THEN** la ficha enseña el texto entero, «— Juan» incluido, y no hay firma

#### Scenario: Solo la firma
- **WHEN** la descripción es solo «— El Paquetes»
- **THEN** la ficha no enseña un párrafo vacío y no hay firma

### Requirement: La firma se lee como de la crew, no como de un cliente
La firma SHALL ser texto que leen los lectores de pantalla («El Paquetes, de la crew») y la
cabeza SHALL ser decorativa. La ficha SHALL NOT presentarla como reseña ni opinión de un
cliente.

#### Scenario: Lector de pantalla
- **WHEN** un lector de pantalla recorre una ficha firmada
- **THEN** lee el texto y después «El Paquetes, de la crew», sin anunciar la imagen

### Requirement: De noche firma el mismo muñeco con su dibujo de noche
Con el modo noche, la firma SHALL usar el dibujo de noche del muñeco, como el resto del
sitio, y SHALL conservar su nombre de día.

#### Scenario: Ficha firmada de noche
- **WHEN** se abre de noche una ficha firmada por El Lata
- **THEN** la cabeza es la de su versión de noche y el nombre sigue siendo «El Lata»

### Requirement: El muñeco que firma grita al añadir su camiseta
En una ficha firmada, al añadir el producto al carrito con éxito, SHALL aparecer el grito de
ese muñeco junto a la foto mientras el botón dice «Añadido ✓», y SHALL irse con él. El grito
SHALL ser decorativo (no se anuncia) y SHALL NOT aparecer si el añadido falla.

#### Scenario: Añadir «Buen chico»
- **WHEN** se añade al carrito «Buen chico», firmada por Rocky
- **THEN** salta «¡GUAU!» junto a la foto durante el «Añadido ✓» y después desaparece

#### Scenario: El añadido falla
- **WHEN** el añadido falla por falta de stock
- **THEN** no aparece ningún grito

#### Scenario: Movimiento reducido
- **WHEN** alguien con movimiento reducido añade una camiseta firmada
- **THEN** el grito aparece y se va sin saltar ni girar

### Requirement: El Taller explica cómo firmar
Bajo el campo de descripción de un diseño, El Taller SHALL decir en una línea que para que
firme un muñeco la descripción termina en «— Nombre» con el nombre de la crew.

#### Scenario: Editar un diseño
- **WHEN** se abre un diseño en El Taller
- **THEN** bajo la descripción se lee cómo firmar, con un ejemplo
