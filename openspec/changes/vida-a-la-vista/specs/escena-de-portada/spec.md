# Spec Delta

## Purpose

Que la escena del encabezado de la portada (el grafitero que pinta la línea, su chorro y la
Cruiser que la recorre) se vea entera, sin gastarse mientras otra cosa tapa la pantalla.

## ADDED Requirements

### Requirement: La escena de la portada espera a que se vaya la intro
Mientras la intro de la primera visita esté en pantalla, el trazo del spray, las gotas del
chorro y la Cruiser de la portada SHALL quedarse en su primer fotograma, sin avanzar ni
consumir su espera. Cuando la intro desaparece, SHALL arrancar desde el principio, con la
misma duración y el mismo orden que cuando no hay intro.

#### Scenario: Primera visita con intro
- **WHEN** alguien abre la portada por primera vez en la sesión y la intro tapa la pantalla 3 s
- **THEN** al irse la intro la línea empieza a pintarse desde la derecha y la Cruiser cruza después, como sin intro

#### Scenario: Visita sin intro
- **WHEN** alguien vuelve a la portada en la misma sesión y no hay intro
- **THEN** la escena arranca al cargar, igual que hoy

### Requirement: La escena sigue respetando el movimiento reducido
Con movimiento reducido, la escena SHALL seguir como hoy: la línea pintada y la Cruiser en
su sitio, sin chorro y sin animación, haya intro o no.

#### Scenario: Movimiento reducido con intro
- **WHEN** alguien con movimiento reducido abre la portada por primera vez
- **THEN** al irse la intro la línea ya está pintada y nada se mueve
