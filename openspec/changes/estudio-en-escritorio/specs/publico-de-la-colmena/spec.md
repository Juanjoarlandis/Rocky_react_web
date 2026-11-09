# Spec Delta

## Purpose

Dar vida a La Colmena en ordenador con la crew bailando lo que suena en la mesa: cada pista
tiene su personaje, y la pista que suena saca a bailar al suyo.

## ADDED Requirements

### Requirement: Un personaje por pista en la grada de la mesa
Desde 1200 px de ancho, la mesa SHALL tener sentados en su canto de arriba, como en una grada,
ocho personajes de la crew: uno por pista y siempre el mismo para cada una, junto a El Freeze.

- La grada SHALL ocupar el hueco que hoy ya queda sobre la mesa, sin hacerla más alta.
- Los personajes SHALL ser decorativos: SHALL NOT recibir foco ni llegar al lector de
  pantalla, y SHALL NOT tapar ningún control de la mesa.
- Por debajo de 1200 px SHALL NOT verse.

#### Scenario: Grada en una pantalla grande
- **WHEN** se abre La Colmena a 1280 px y a 1920 px
- **THEN** sobre la mesa hay ocho personajes y ninguno tapa la cabecera, la rejilla, los pads ni la consola

#### Scenario: Móvil
- **WHEN** se abre La Colmena a 375 px
- **THEN** el público no aparece

### Requirement: Baila quien suena
Con la mesa en marcha, el personaje de una pista SHALL bailar al pulso del BPM de la mesa
mientras su pista suene: que tenga algún paso encendido y no esté callada por mute o por el
solo de otra pista. Si su pista no suena, o la mesa está parada, SHALL quedarse sentado o
quieto. Al cambiar el tempo, el baile SHALL seguir el tempo nuevo.

#### Scenario: Entra el bombo
- **WHEN** suena la mesa solo con bombo y caja, y alguien enciende pasos en el hi-hat
- **THEN** se ponen a bailar tres personajes: el del bombo, el de la caja y el del hi-hat

#### Scenario: Silenciar una pista
- **WHEN** se silencia la caja mientras suena el beat
- **THEN** el personaje de la caja deja de bailar y los demás siguen

#### Scenario: Parar
- **WHEN** se para la mesa
- **THEN** todos los personajes se quedan quietos

### Requirement: Respeta el movimiento reducido y la noche
Con movimiento reducido, los personajes SHALL NOT animarse. Seguirán indicando qué pistas
suenan con un cambio de postura o de opacidad, sin movimiento. En el modo neón SHALL usarse su
versión de noche, como el resto de muñecos de la web.

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide movimiento reducido y suena la mesa
- **THEN** ningún personaje se mueve, pero los de las pistas que suenan se distinguen de los demás

#### Scenario: Modo neón
- **WHEN** se enciende el descontrol con la mesa en marcha
- **THEN** el público pasa a su versión de noche y sigue bailando
