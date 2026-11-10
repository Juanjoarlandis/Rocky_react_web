# Spec Delta

## Purpose

Que la mesa de beats parezca un aparato de verdad dibujado a mano: una consola con cinta,
capuchones y ledes, leyendas serigrafiadas y un modo neón que sea suyo.

## ADDED Requirements

### Requirement: La consola es de máquina
Cada canal de la consola SHALL mostrar el nombre de su pista rotulado a mano sobre una tira de
cinta, un fader con capuchón que corre por una ranura con escala y un vúmetro de segmentos
junto al fader. El canal maestro SHALL distinguirse de los de pista. Los controles SHALL seguir
siendo los mismos: el fader se maneja con teclado y anuncia su valor, y mute y solo dicen su
estado.

#### Scenario: Leer la consola
- **WHEN** se mira la consola a 1440 px
- **THEN** cada canal dice el nombre de su pista en su cinta y enseña fader, vúmetro, mute y solo

#### Scenario: Teclado y lector
- **WHEN** alguien lleva el foco al fader del bombo y pulsa las flechas
- **THEN** el volumen cambia y el lector anuncia «Volumen de Bombo» con su porcentaje

#### Scenario: Canal callado
- **WHEN** una pista está silenciada o tapada por el solo de otra
- **THEN** su canal se ve apagado

#### Scenario: Navegador que no gira el fader
- **WHEN** el navegador no sabe poner un deslizador en vertical
- **THEN** el fader se queda en horizontal dentro de su canal y sigue funcionando

### Requirement: Las leyendas van serigrafiadas
Las leyendas fijas del aparato (Tempo, Swing, Volumen, Ritmos y Tono) SHALL ir en la misma
letra de serigrafía que los nombres de canal y la pantalla: monoespaciada, en mayúsculas y
pequeña. Lo que se elige (ritmos, bancos, nombres de pista) SHALL seguir en la letra de mano.

#### Scenario: Una sola voz para las leyendas
- **WHEN** se mira el transporte y los pads
- **THEN** «TEMPO», «SWING», «RITMOS» y «TONO» comparten letra, tamaño y color

### Requirement: Las acciones del pie son botones
Todas las acciones del pie de la mesa SHALL verse como botones sobre el chasis oscuro, también
la principal («Compartir beat»).

#### Scenario: Compartir beat
- **WHEN** se mira el pie de la mesa
- **THEN** «Compartir beat» se ve como un botón, destacado entre los demás

### Requirement: La mesa tiene su modo neón
Con el modo neón encendido, la pantalla, el botón de reproducir, los mandos, los faders y las
opciones elegidas SHALL pasar a luz ultravioleta (violeta y lima) y SHALL NOT quedar en ámbar.
Los pasos encendidos y la columna que suena SHALL resplandecer. El texto de la pantalla SHALL
seguir leyéndose.

#### Scenario: Encender el descontrol
- **WHEN** se enciende el modo neón con la mesa a la vista
- **THEN** la pantalla, el play y los faders dejan el ámbar por el violeta y los pasos encendidos brillan

#### Scenario: De día no cambia
- **WHEN** el modo neón está apagado
- **THEN** la mesa conserva su ámbar
