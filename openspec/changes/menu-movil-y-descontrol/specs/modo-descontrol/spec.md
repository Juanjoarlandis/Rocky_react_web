# Spec Delta

## Purpose

Qué pasa cuando alguien enciende el modo descontrol con la bombilla.

## ADDED Requirements

### Requirement: Activar el descontrol lleva a la portada tras el rótulo
Al encender el modo descontrol con la bombilla, la web SHALL mostrar el rótulo
«Descontrol activado» y, cuando termine, SHALL navegar a la portada (`/`). Si el usuario
prefiere movimiento reducido, no hay rótulo y la navegación SHALL ser inmediata. Si ya se
está en la portada, SHALL NOT navegar. Llegar a la web con el descontrol ya puesto y
apagarlo SHALL NOT navegar.

#### Scenario: Encender fuera de la portada
- **WHEN** en `/estudio` se enciende el descontrol con la bombilla
- **THEN** se ve el rótulo «Descontrol activado» y, cuando desaparece, la ruta es `/`

#### Scenario: Encender en la portada
- **WHEN** en `/` se enciende el descontrol
- **THEN** se ve el rótulo y la ruta sigue siendo `/`, sin una entrada nueva en el historial

#### Scenario: Apagar a mitad del rótulo
- **WHEN** se enciende el descontrol y se apaga antes de que termine el rótulo
- **THEN** el rótulo desaparece y no se navega

#### Scenario: Movimiento reducido
- **WHEN** con movimiento reducido se enciende el descontrol fuera de la portada
- **THEN** no hay rótulo y se navega a `/` en ese momento

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
