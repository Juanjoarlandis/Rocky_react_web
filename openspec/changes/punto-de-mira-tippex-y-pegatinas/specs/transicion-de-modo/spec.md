# Spec Delta

## Purpose

Que pasar del día a la noche y de la noche al día se vea como un gesto de cuaderno:
rotulador para entrar, corrector para salir.

## ADDED Requirements

### Requirement: Encender el descontrol tapa la hoja de día con rotulador
Al encender el descontrol con la bombilla, la capa SHALL empezar como la hoja de día
(papel y punteado del cuaderno) y unas pasadas de rotulador de tinta SHALL taparla antes
de encenderse el rótulo «Descontrol activado». La duración total del rótulo SHALL seguir
siendo de 1,4 s. Llegar a la web ya de noche SHALL NOT mostrar los trazos.

#### Scenario: Encender
- **WHEN** se pulsa «Activar el descontrol»
- **THEN** la tinta tapa el papel de día en menos de 0,4 s, después se enciende el rótulo y a los 1,4 s todo desaparece

#### Scenario: Llegar de noche
- **WHEN** se carga la web con el descontrol ya puesto
- **THEN** no hay trazos ni rótulo

### Requirement: El trazo es de rotulador también en móvil
El grosor de las pasadas SHALL NOT pasar del 40 % del lado corto de la pantalla, para que
en móvil se lea como rotulador y no como un telón, y las pasadas SHALL tapar la pantalla
entera sin dejar franjas.

#### Scenario: Móvil vertical
- **WHEN** se enciende el descontrol en una pantalla de 390 × 844
- **THEN** cada pasada mide como mucho 156 px de grosor y la pantalla queda tapada entera

### Requirement: Apagar el descontrol lo borra con corrector
Al apagar el descontrol con la bombilla, una capa del color de la noche SHALL cubrir la
pantalla y unos brochazos de corrector SHALL abrirle agujeros por los que se vea el día de
verdad, con el borde blanco del corrector, hasta destaparlo entero en 0,7 s. Al terminar,
la capa SHALL desaparecer del DOM. La capa SHALL NOT recibir clics ni foco.

#### Scenario: Apagar
- **WHEN** con el descontrol puesto se pulsa «Apagar el descontrol»
- **THEN** la noche se abre a brochazos, se ve el día por los agujeros y en 0,7 s queda el día entero

### Requirement: Volver a encender a mitad del borrado
Si se vuelve a encender durante el borrado, el borrado SHALL desaparecer y SHALL empezar
el encendido.

#### Scenario: Volver a encender a mitad
- **WHEN** se apaga y se vuelve a encender antes de que termine el borrado
- **THEN** el borrado desaparece y empieza el encendido con su rótulo

### Requirement: Con movimiento reducido no hay transiciones
Si el usuario prefiere movimiento reducido, encender y apagar el descontrol SHALL NOT
mostrar trazos, rótulo ni corrector.

#### Scenario: Movimiento reducido
- **WHEN** con movimiento reducido se enciende y se apaga el descontrol
- **THEN** el modo cambia sin ninguna capa encima
