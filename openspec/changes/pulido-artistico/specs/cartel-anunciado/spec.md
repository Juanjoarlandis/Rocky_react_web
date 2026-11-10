# Spec Delta

## Purpose

Que el cartel de un drop anunciado diga las cosas una vez, invite a arrancar una pestaña y deje
algo en la mano de quien la arranca.

## ADDED Requirements

### Requirement: La fecha se dice una vez
La hoja del cartel de un drop anunciado SHALL decir la fecha y la hora de salida una sola vez,
también en la página del drop, donde van los botones de calendario.

#### Scenario: Página del drop
- **WHEN** se abre la página de un drop anunciado
- **THEN** la hoja dice la fecha y la hora una vez, junto a los botones de calendario

#### Scenario: Muro y portada
- **WHEN** el mismo cartel se ve en el muro o en la portada
- **THEN** la fecha y la hora se leen una vez

### Requirement: El cartel invita a arrancar
Mientras no se haya arrancado ninguna pestaña, junto a la tira SHALL verse una nota a mano que
invite a arrancar una. La nota SHALL ser decorativa para el lector de pantalla (el botón ya
tiene su nombre) y SHALL desaparecer al arrancar la primera.

#### Scenario: Antes de arrancar
- **WHEN** se ve un cartel anunciado
- **THEN** una nota a mano señala las pestañas

#### Scenario: Después de arrancar
- **WHEN** se arranca una pestaña
- **THEN** la nota ya no está

### Requirement: La pestaña arrancada es un resguardo
Al arrancar una pestaña, SHALL quedarse junto al aviso como resguardo con la fecha del drop. Al
apuntarse con el email, el resguardo SHALL quedar sellado «APUNTADO»; si ya estaba apuntado,
SHALL salir sellado. El resguardo SHALL NOT pedir datos ni añadir pasos al aviso. Con
movimiento reducido SHALL NOT animarse.

#### Scenario: Arrancar
- **WHEN** alguien arranca una pestaña
- **THEN** ve el resguardo con la fecha del drop, sin sello, junto al formulario

#### Scenario: Apuntarse
- **WHEN** deja su email y el aviso se guarda
- **THEN** el resguardo queda sellado «APUNTADO»

#### Scenario: El envío falla
- **WHEN** el servidor rechaza el aviso
- **THEN** el resguardo sigue sin sello y se ve el error de siempre
