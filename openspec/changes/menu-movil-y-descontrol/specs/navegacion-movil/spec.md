# Spec Delta

## Purpose

Que las capas que tapan la página (hoja del menú, lightbox, intro) no dejen que se mueva
debajo, que la barra siga arriba y que la hoja del menú se pueda cerrar siempre.

## ADDED Requirements

### Requirement: Las capas que tapan la página bloquean su desplazamiento
Mientras esté abierta la hoja del menú, el lightbox o la intro, la página de debajo SHALL
NOT desplazarse con la rueda, el dedo ni el teclado, y la barra de navegación SHALL
seguir visible arriba del todo. Al cerrarse la última capa, la página SHALL quedar en la
misma posición de scroll que tenía y volver a desplazarse con normalidad.

#### Scenario: Hoja abierta después de bajar
- **WHEN** en móvil se baja por la página y después se abre la hoja del menú
- **THEN** la barra con el botón «Cerrar el menú» se ve arriba del todo y el botón cierra la hoja

#### Scenario: Deslizar con la hoja abierta
- **WHEN** con la hoja abierta se desliza el dedo o se gira la rueda sobre ella
- **THEN** la posición de scroll de la página no cambia

#### Scenario: Cerrar devuelve la página donde estaba
- **WHEN** se cierra la hoja o el lightbox
- **THEN** la página sigue en la posición en la que estaba al abrirla y se puede desplazar

#### Scenario: Capas solapadas
- **WHEN** se abre una capa mientras otra sigue abierta y se cierran en cualquier orden
- **THEN** la página sigue bloqueada mientras quede alguna abierta y vuelve a desplazarse al cerrarse la última

### Requirement: La hoja del menú se puede cerrar desde dentro
La hoja del menú SHALL contener un control con nombre accesible «Cerrar», distinto del
botón «Cerrar el menú» de la barra, al que se llegue con el teclado dentro de su ciclo de
foco y que un lector de pantalla encuentre dentro del diálogo. Activarlo SHALL cerrar la
hoja y devolver el foco al botón de la barra. El control SHALL verse cuando tiene el foco.

#### Scenario: Cerrar con el teclado
- **WHEN** con la hoja abierta se recorre su contenido con Tab hasta «Cerrar» y se pulsa Enter
- **THEN** la hoja se cierra y el foco queda en el botón «Abrir el menú»

#### Scenario: Control dentro del diálogo
- **WHEN** se abre la hoja
- **THEN** el diálogo «Menú» contiene un botón «Cerrar»

#### Scenario: Escape sigue cerrando
- **WHEN** con la hoja abierta se pulsa Escape
- **THEN** la hoja se cierra y el foco vuelve al botón de la barra
