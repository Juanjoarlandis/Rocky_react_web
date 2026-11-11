# Spec Delta

## Purpose

Que el texto de la web se corrija a la vista, como en un cuaderno: una palabra tachada a
rotulador y la buena al lado, sin confundir a quien lee con lector de pantalla.

## ADDED Requirements

### Requirement: Las frases elegidas se corrigen con un tachón
Tres frases SHALL llevar una palabra tachada a rotulador seguida de la buena: el título del
carrito vacío («Tu carrito está ~~lleno~~ vacío»), el texto del 404 de día («La página que
buscas ~~está aquí~~ no existe») y el muro sin carteles («El Pegador está ~~durmiendo~~ en
ello»). El tachón SHALL ir en el acento del tema (el rojo de la casa de día, el de neón
de noche), para que se distinga de la palabra que tacha.

#### Scenario: Carrito vacío
- **WHEN** se abre el carrito sin productos
- **THEN** el título dice «Tu carrito está», «lleno» tachado y «vacío»

#### Scenario: 404 de noche
- **WHEN** se abre una ruta que no existe con el modo noche encendido
- **THEN** el texto es el de noche, sin tachón

### Requirement: Lo tachado no se lee
La palabra tachada SHALL quedar oculta a los lectores de pantalla, que SHALL leer solo la
frase correcta. Los tachones SHALL NOT ir sobre precios, sobre la fecha de un drop ni sobre
avisos de estado.

#### Scenario: Lector de pantalla en el carrito vacío
- **WHEN** un lector de pantalla lee el título del carrito vacío
- **THEN** oye «Tu carrito está vacío»

### Requirement: El tachón se dibuja una vez
Con movimiento sin reducir, el tachón SHALL dibujarse sobre la palabra una sola vez al
aparecer la frase; si la intro de la primera visita tapa la pantalla, SHALL dibujarse cuando
la intro se vaya. Con movimiento reducido SHALL verse ya dibujado.

#### Scenario: Primera visita con intro
- **WHEN** alguien entra por primera vez directamente al carrito vacío y sale la intro
- **THEN** «lleno» se tacha cuando la intro se va, no debajo de ella

#### Scenario: Movimiento reducido
- **WHEN** alguien con movimiento reducido abre el carrito vacío
- **THEN** «lleno» se ve tachado desde el principio, sin animación
