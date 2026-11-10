# Spec Delta

## Purpose

Que en ordenador la mesa de beats de La Colmena se vea entera a la vez (transporte, rejilla,
pads y consola), como un aparato, sin desplazar la página para mezclar.

## ADDED Requirements

### Requirement: La mesa entera cabe en la ventana
Desde 1200 px de ancho y 880 px de alto de ventana, la mesa SHALL caber entera bajo la barra de
navegación sin desplazar la página: cabecera, transporte, ritmos, rejilla, los 16 pads, la
consola con sus nueve canales y el pie. Para ello la consola SHALL ir bajo la rejilla y los
pads SHALL ocupar todo el alto de la columna de al lado.

#### Scenario: Portátil
- **WHEN** en una ventana de 1440×900 se coloca la mesa justo bajo la barra de navegación
- **THEN** se ven a la vez el transporte, la rejilla, los 16 pads, los nueve faders y los botones del pie

#### Scenario: Pantalla grande
- **WHEN** la ventana es de 1920×1080
- **THEN** además cabe el público sentado en el canto de la mesa

#### Scenario: Ventana baja
- **WHEN** la ventana es de 1366×768
- **THEN** la mesa conserva la misma distribución, nada se solapa ni se recorta, y lo que no cabe se alcanza desplazando la página

### Requirement: Los pads crecen
En ordenador los pads SHALL repartirse todo el alto de su columna.

#### Scenario: Pads grandes
- **WHEN** se abre la mesa a 1440×900
- **THEN** cada pad mide al menos 80 px de alto

### Requirement: Por debajo de 1200 px no cambia nada
Por debajo de 1200 px de ancho la mesa SHALL conservar la distribución en una columna y los
controles por fila que tiene hoy.

#### Scenario: Tableta y móvil
- **WHEN** se abre La Colmena a 900 px o a 375 px
- **THEN** la mesa sigue en una columna, con el solo y el volumen en cada fila, y no desborda el ancho de la pantalla
