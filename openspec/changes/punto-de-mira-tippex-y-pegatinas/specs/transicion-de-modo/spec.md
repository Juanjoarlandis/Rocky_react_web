# Spec Delta

## Purpose

Que pasar del día a la noche y de la noche al día se vea como un gesto de cuaderno:
rotulador para entrar, corrector para salir.

## ADDED Requirements

### Requirement: Encender el descontrol tapa la pantalla con rotulador
Al encender el descontrol con la bombilla, antes de encenderse el rótulo «Descontrol
activado», unos trazos gruesos de rotulador negro SHALL cubrir la pantalla. La duración
total del rótulo SHALL seguir siendo la misma (1,4 s), de modo que el momento en que se
avisa para ir a la portada no cambie. Llegar a la web ya de noche SHALL NOT mostrar los
trazos.

#### Scenario: Encender
- **WHEN** se pulsa «Activar el descontrol»
- **THEN** los trazos cubren la pantalla en el primer medio segundo, después se enciende el rótulo y a los 1,4 s todo desaparece

#### Scenario: Llegar de noche
- **WHEN** se carga la web con el descontrol ya puesto
- **THEN** no hay trazos ni rótulo

### Requirement: Apagar el descontrol lo borra con corrector
Al apagar el descontrol con la bombilla, una capa del color de la noche SHALL cubrir la
pantalla y unos brochazos de corrector SHALL irla borrando hasta dejar ver el día, en
0,7 s. Al terminar, la capa SHALL desaparecer del DOM. La capa SHALL NOT recibir clics ni
foco. Si se vuelve a encender durante el borrado, el borrado SHALL desaparecer y empezar
el encendido.

#### Scenario: Apagar
- **WHEN** con el descontrol puesto se pulsa «Apagar el descontrol»
- **THEN** la noche se borra a brochazos en 0,7 s y queda el día

#### Scenario: Volver a encender a mitad
- **WHEN** se apaga y se vuelve a encender antes de que termine el borrado
- **THEN** el borrado desaparece y empieza el encendido con su rótulo

### Requirement: Con movimiento reducido no hay transiciones
Si el usuario prefiere movimiento reducido, encender y apagar el descontrol SHALL NOT
mostrar trazos, rótulo ni corrector.

#### Scenario: Movimiento reducido
- **WHEN** con movimiento reducido se enciende y se apaga el descontrol
- **THEN** el modo cambia sin ninguna capa encima
