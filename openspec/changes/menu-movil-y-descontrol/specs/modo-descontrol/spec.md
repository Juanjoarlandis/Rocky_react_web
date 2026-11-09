# Spec Delta

## Purpose

Qué pasa cuando alguien enciende el modo descontrol con la bombilla.

## ADDED Requirements

### Requirement: Activar el descontrol lleva a la portada bajo la tinta
Al encender el modo descontrol con la bombilla, la web SHALL mostrar el rótulo
«Descontrol activado» y SHALL navegar a la portada (`/`) mientras la tinta tapa la
pantalla, antes de que se retire el rótulo, de modo que al retirarse ya se vea la portada
y no la página de partida. Con movimiento reducido no hay rótulo y la navegación SHALL ser
inmediata.

#### Scenario: Encender fuera de la portada
- **WHEN** en `/estudio` se enciende el descontrol con la bombilla
- **THEN** con la pantalla tapada por la tinta la ruta pasa a `/`, y al retirarse el rótulo se ve la portada

#### Scenario: Movimiento reducido
- **WHEN** con movimiento reducido se enciende el descontrol fuera de la portada
- **THEN** no hay rótulo y se navega a `/` en ese momento

### Requirement: El descontrol no navega cuando no toca
La web SHALL NOT navegar si ya se está en la portada, si se llega a la web con el
descontrol ya puesto, si se apaga, ni si se apaga antes de que la tinta tape la pantalla.

#### Scenario: Encender en la portada
- **WHEN** en `/` se enciende el descontrol
- **THEN** se ve el rótulo y la ruta sigue siendo `/`, sin una entrada nueva en el historial

#### Scenario: Apagar antes de que la tinta tape la pantalla
- **WHEN** se enciende el descontrol y se apaga antes de que la tinta tape la pantalla
- **THEN** el rótulo desaparece y no se navega

#### Scenario: Apagar con la tinta ya puesta
- **WHEN** se enciende el descontrol fuera de la portada y se apaga después de que la tinta tape la pantalla
- **THEN** la navegación ya ha ocurrido: se queda en la portada, de día, y sale el corrector

#### Scenario: Apagar no navega
- **WHEN** con el descontrol puesto se apaga con la bombilla
- **THEN** la ruta no cambia

### Requirement: Encender desde la hoja del menú cierra la hoja
Si el descontrol se enciende con la bombilla de la hoja del menú, la hoja SHALL cerrarse
para que se vea el rótulo. Apagarlo desde la hoja SHALL NOT cerrarla.

#### Scenario: Encender desde la hoja
- **WHEN** con la hoja abierta se pulsa «Activar el descontrol»
- **THEN** la hoja se cierra

#### Scenario: Apagar desde la hoja
- **WHEN** con el descontrol puesto y la hoja abierta se pulsa «Apagar el descontrol»
- **THEN** la hoja sigue abierta
