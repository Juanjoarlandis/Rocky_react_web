# Spec Delta

## Purpose

Que la barra de herramientas del spray del modo neón estorbe lo mínimo a la pared y que elegir
color sea coger un bote, no pulsar un punto.

## ADDED Requirements

### Requirement: La barra mide lo que sus herramientas
La barra del spray SHALL ajustarse al ancho de sus herramientas y SHALL NOT superar 720 px de
ancho en ordenador. El aviso y la lista de firmas SHALL partirse en líneas dentro de ese ancho.
En pantallas estrechas la barra SHALL NOT ocupar más de un tercio del alto de la ventana: la
lista de firmas SHALL desplazarse dentro de la barra.

#### Scenario: Ordenador
- **WHEN** se coge el spray a 1440 px de ancho con la pared compartida encendida
- **THEN** la barra mide como mucho 720 px de ancho y deja ver la pared a sus lados

#### Scenario: Móvil con la lista abierta
- **WHEN** a 375×812 se abre la lista con diez firmas
- **THEN** la barra no pasa de un tercio del alto de la ventana y la lista se desplaza dentro

### Requirement: Los colores son botes
Cada color del spray SHALL presentarse como un bote dibujado con su color. El grupo SHALL seguir
siendo un grupo de opciones con nombre («Lima», «Violeta», «Blanco UV») manejable con teclado.
El bote elegido SHALL distinguirse por su postura (levantado), no solo por el color. Con
movimiento reducido SHALL NOT animarse.

#### Scenario: Elegir otro bote
- **WHEN** alguien pulsa el bote «Violeta»
- **THEN** ese bote queda levantado y marcado como elegido, y lo siguiente se pinta en violeta

#### Scenario: Lector de pantalla
- **WHEN** un lector recorre los botes
- **THEN** oye «Lima», «Violeta» y «Blanco UV» y cuál está elegido

### Requirement: El bote suena al cogerlo
Al elegir un bote distinto del que se tenía SHALL sonar un traqueteo corto y bajo. Si el
navegador no deja sonar o el audio falla, SHALL NOT mostrarse ningún error ni dejar de
cambiarse el color.

#### Scenario: Sin audio
- **WHEN** el navegador no tiene audio disponible y se elige otro bote
- **THEN** el color cambia igual y no aparece ningún aviso

#### Scenario: El mismo bote
- **WHEN** se pulsa el bote que ya estaba elegido
- **THEN** no suena nada
