# Spec Delta

## Purpose

Que lo pensado para el puntero no deje la web a medias en una pantalla táctil: nada se queda
levantado, girado o agrandado después de un toque, y el teclado conserva todas sus señales.

## ADDED Requirements

### Requirement: Lo que se mueve al pasar el puntero solo se mueve con puntero
Cualquier efecto de `:hover` que desplace, gire o escale un elemento SHALL aplicarse solo en
pantallas que admiten hover. En una pantalla táctil, tocar un elemento SHALL NOT dejarlo
levantado, girado ni agrandado después del toque.

#### Scenario: Tocar una tarjeta del catálogo en el móvil
- **WHEN** en un móvil se toca la tarjeta de un producto y se vuelve atrás
- **THEN** la tarjeta conserva su inclinación de pegatina y su sombra de siempre, sin quedarse levantada

#### Scenario: Pasar el ratón en escritorio
- **WHEN** en un ordenador con ratón el puntero pasa sobre una tarjeta
- **THEN** la tarjeta se levanta y su foto se acerca, como hoy

### Requirement: El teclado y la pulsación conservan sus señales
Separar el hover por tipo de pantalla SHALL NOT quitar ningún efecto de `:focus-visible` ni de
`:active`: los que hoy comparten regla con `:hover` SHALL seguir aplicándose con el foco de
teclado o al pulsar en cualquier pantalla.

#### Scenario: Navegar con Tab en un portátil táctil
- **WHEN** en una pantalla sin hover se recorre la web con Tab
- **THEN** cada elemento enfocado muestra el mismo efecto de foco que hoy

#### Scenario: Pulsar un botón en el móvil
- **WHEN** se mantiene pulsado un botón de la casa en el móvil
- **THEN** el botón se hunde como hoy al pulsarlo
