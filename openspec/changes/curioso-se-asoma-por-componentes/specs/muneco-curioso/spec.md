# Spec Delta

## Purpose

Que el muñeco curioso solo se asome por los cantos dibujados de los componentes de la
página, nunca desde detrás de una imagen ni de algo transparente.

## ADDED Requirements

### Requirement: Solo se esconde detrás de bloques de color opaco
Un bloque SHALL valer de escondite solo si pinta un fondo de color opaco (o es una franja
con línea dibujada encima dentro de un bloque así). Un bloque cuyo único fondo es una
imagen (punteado, garabato, textura) SHALL NOT valer, porque entre sus trazos se vería
el recorte.

#### Scenario: Imagen de fondo sin color
- **WHEN** un bloque grande solo tiene `background-image` (por ejemplo el punteado del cuaderno)
- **THEN** no se usa de escondite

#### Scenario: Color opaco con imagen encima
- **WHEN** un bloque tiene un color de fondo opaco y además una imagen de fondo
- **THEN** sí vale de escondite

### Requirement: El canto por el que se asoma lo pinta el propio componente
Cada colocación SHALL comprobar el tramo del canto que tapa al muñeco. Si en ese tramo lo
que se ve es una imagen (`img`, `picture`, `svg`, `canvas`, `video`) o un elemento que no
es del bloque, la colocación SHALL descartarse.

#### Scenario: Tarjeta de producto por arriba
- **WHEN** el muñeco iba a asomarse por el canto superior de una tarjeta cuya parte de arriba es la foto
- **THEN** esa colocación se descarta

#### Scenario: Franja bajo la foto
- **WHEN** el muñeco se asoma por la franja de texto de la tarjeta, cuyo canto es la línea del borde inferior de la foto
- **THEN** la colocación vale

#### Scenario: Esquina junto a la foto
- **WHEN** el tramo lateral que lo tapa en una esquina cae a la altura de la foto
- **THEN** esa esquina se descarta

#### Scenario: Sin ningún canto válido
- **WHEN** ninguna colocación pasa la comprobación
- **THEN** se asoma por el borde de la pantalla o espera a la próxima vez, como hasta ahora
