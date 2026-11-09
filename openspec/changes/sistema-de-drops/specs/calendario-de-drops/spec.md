# Spec Delta

## Purpose

Define qué es un drop de ROCKY 035, dónde se guarda, qué configuración admite y cómo se
deriva su estado público a partir de sus fechas, sin tocar código ni desplegar.

## ADDED Requirements

### Requirement: Un drop es una colección de Shopify con su configuración
Un drop SHALL ser una colección de Shopify cuyo handle empieza por `rocky-drop-` y que lleva
el metacampo JSON `rocky.drop` con versión, número, lema, historia, fecha de lanzamiento,
fecha de cierre opcional y estado (`borrador` o `programado`). La imagen de la colección
SHALL ser el cartel del drop. Una colección sin metacampo válido SHALL NOT tratarse como
drop.

#### Scenario: Colección con configuración válida
- **WHEN** existe la colección `rocky-drop-6` con un `rocky.drop` válido
- **THEN** el drop aparece en el modelo de drops con su número, textos, fechas y cartel

#### Scenario: Metacampo roto
- **WHEN** una colección `rocky-drop-x` tiene un `rocky.drop` que no pasa la validación
- **THEN** no aparece como drop, el resto de drops se sirve igual y el servidor registra el aviso sin el contenido

### Requirement: La configuración del drop se valida
La configuración SHALL validarse al guardarla y al leerla:
- número entero de 1 a 999, único entre los drops;
- lema de hasta 80 caracteres e historia de hasta 600;
- fechas ISO 8601 con zona horaria;
- cierre al menos una hora después del lanzamiento;
- un drop `programado` SHALL tener fecha de lanzamiento.

Lo que no cumpla SHALL rechazarse con un código de error, sin guardar nada.

#### Scenario: Cierre antes del lanzamiento
- **WHEN** se guarda un drop con cierre anterior a su lanzamiento
- **THEN** se rechaza con el código `DROP_INVALID` y la colección no cambia

#### Scenario: Programado sin fecha
- **WHEN** se intenta programar un drop sin fecha de lanzamiento
- **THEN** se rechaza y el drop sigue en borrador

#### Scenario: Número repetido
- **WHEN** se guarda un drop con el número de otro drop existente
- **THEN** se rechaza con `DROP_NUMBER_TAKEN`

### Requirement: El estado público se deriva de las fechas
El estado público SHALL calcularse con la hora del servidor:
- `borrador`: no es público;
- `anunciado`: aún no ha llegado el lanzamiento;
- `en-la-calle`: lanzado y sin cierre, o con más de 48 h por delante;
- `ultimas-horas`: dentro de las 48 h previas al cierre;
- `archivo`: pasado el cierre, o sin cierre y con todos sus diseños agotados.

#### Scenario: Antes y después del lanzamiento
- **WHEN** un drop programado para las 20:00 se consulta a las 19:59 y a las 20:00
- **THEN** a las 19:59 está `anunciado` y a las 20:00 está `en-la-calle`

#### Scenario: Ventana de cierre
- **WHEN** un drop con cierre el día 20 a las 20:00 se consulta el 18 a las 20:00 y el 20 a las 20:00
- **THEN** el 18 a las 20:00 está en `ultimas-horas` y el 20 a las 20:00 en `archivo`

#### Scenario: Sin cierre y todo agotado
- **WHEN** un drop lanzado y sin cierre tiene todos sus diseños agotados
- **THEN** su estado es `archivo`

#### Scenario: Borrador
- **WHEN** un drop está en `borrador`, tenga las fechas que tenga
- **THEN** no aparece en ninguna respuesta pública

### Requirement: El revelado y el cierre no necesitan a nadie
El cambio de estado SHALL ocurrir solo, sin ninguna acción manual. Las respuestas públicas
SHALL reflejar el estado nuevo como mucho 60 segundos después de la hora. La web abierta
SHALL pedir el estado nuevo cuando su cuenta atrás llegue a cero.

#### Scenario: Página abierta al llegar la hora
- **WHEN** alguien tiene abierto el muro con un drop anunciado y llega su hora
- **THEN** sin recargar, el cartel pasa a «en la calle» en menos de un minuto

### Requirement: Las horas son las de Madrid y la cuenta atrás, la del servidor
Las fechas SHALL mostrarse en la hora de Madrid, indicándolo. La cuenta atrás SHALL
calcularse con la hora del servidor, corrigiendo la diferencia con el reloj del navegador.

#### Scenario: Reloj del navegador adelantado
- **WHEN** el reloj del navegador va 10 minutos adelantado
- **THEN** la cuenta atrás marca el mismo tiempo que con el reloj en hora

### Requirement: Hay un drop destacado
El drop destacado SHALL ser el anunciado con el lanzamiento más próximo. Si no hay ninguno,
SHALL ser el lanzado más recientemente que siga a la venta, y si tampoco, ninguno. La
portada, la cinta del pie y el calendario heredado SHALL usar el destacado.

#### Scenario: Uno anunciado y uno en la calle
- **WHEN** el Drop 6 está anunciado y el Drop 5 en la calle
- **THEN** el destacado es el Drop 6

#### Scenario: Ninguno a la vista
- **WHEN** todos los drops están en archivo
- **THEN** no hay destacado y la portada no anuncia ningún drop

### Requirement: Cada drop anunciado tiene evento de calendario
Cada drop anunciado SHALL ofrecer un `.ics` con su lanzamiento en UTC y avisos un día y una
hora antes, en `/api/drops/<handle>/calendario.ics`. `/api/drop/calendario.ics` SHALL servir
el del destacado. Un drop que no está anunciado SHALL responder 404.

#### Scenario: Calendario del anunciado
- **WHEN** se pide el `.ics` del Drop 6 anunciado
- **THEN** llega `text/calendar` con su hora de lanzamiento y dos alarmas

#### Scenario: Calendario de un drop en archivo
- **WHEN** se pide el `.ics` de un drop en archivo
- **THEN** responde 404 con `{ message, code }`
