# Spec Delta

## Purpose

Que el público de La Colmena no solo baile: que se le note cuando su pista está callada, cuando
va sola y cuando suena todo el beat.

## ADDED Requirements

### Requirement: Quien está callado duerme y quien va solo tiene el foco
Con la mesa en marcha, el personaje de una pista con pasos que no suena porque está silenciada
o tapada por el solo de otra SHALL verse dormido. El de una pista en solo que suena SHALL verse
bajo un foco. Una pista sin pasos SHALL quedarse sentada como hasta ahora, sin dormirse. Con la
mesa parada SHALL NOT haber dormidos ni focos.

#### Scenario: Silenciar la caja
- **WHEN** suena un beat con bombo, caja y hi-hat y se silencia la caja
- **THEN** el personaje de la caja se duerme y los del bombo y el hi-hat siguen bailando

#### Scenario: Solo del hi-hat
- **WHEN** se deja solo el hi-hat
- **THEN** su personaje baila bajo el foco y los del bombo y la caja se duermen

#### Scenario: Pista vacía
- **WHEN** suena el beat y la pista del tom no tiene ningún paso
- **THEN** el personaje del tom está sentado, sin dormirse

#### Scenario: Mesa parada
- **WHEN** se para la mesa con la caja silenciada
- **THEN** ningún personaje duerme ni tiene foco

### Requirement: Con las ocho pistas, El Freeze hace su truco
Mientras suenan las ocho pistas a la vez, El Freeze SHALL hacer un truco distinto de su
balanceo. Con menos de ocho SHALL volver al balanceo. Con movimiento reducido SHALL NOT moverse
y SHALL distinguirse de otra forma.

#### Scenario: Entra la octava pista
- **WHEN** suenan siete pistas y se enciende un paso en la octava
- **THEN** El Freeze pasa a hacer su truco

#### Scenario: Se calla una
- **WHEN** suenan las ocho y se silencia una
- **THEN** El Freeze vuelve a su balanceo

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide movimiento reducido y suenan las ocho pistas
- **THEN** El Freeze no se mueve, pero se distingue de cuando no suenan las ocho

### Requirement: La grada no es una fila
Los personajes del público SHALL tener alturas y posturas escalonadas, fijas para cada uno.

#### Scenario: Recargar
- **WHEN** se recarga la página
- **THEN** cada personaje está en el mismo sitio y con la misma postura
