# Spec Delta

## Purpose

Que la firma generada de cada visitante se lea entera junto a lo que ha pintado en la pared
compartida del modo neón, con aspecto de firma y no de etiqueta, y que se pueda saber qué pintó
cada una.

## ADDED Requirements

### Requirement: Una firma por pintada
Los trazos de una misma firma en una pared SHALL agruparse por cercanía en pintadas, y cada
pintada SHALL llevar su firma. Una firma SHALL NOT dibujarse lejos de los trazos a los que
acompaña. Solo SHALL rotularse las 150 pintadas más recientes de la pared.

#### Scenario: La misma firma pinta en dos sitios
- **WHEN** «LUNA-7» pinta en el margen izquierdo y después en el margen derecho de la página
- **THEN** se lee «LUNA-7» junto a cada una de las dos pintadas, y ninguna firma queda entre las dos

#### Scenario: Varios trazos juntos
- **WHEN** «LUNA-7» pinta tres trazos uno encima de otro
- **THEN** se lee «LUNA-7» una sola vez junto a esa pintada

#### Scenario: Cientos de pintadas
- **WHEN** una pared tiene 2000 pintadas de firmas distintas en el mismo sitio
- **THEN** se rotulan las 150 más recientes y la página no se cuelga

### Requirement: La firma se lee entera
Cada firma SHALL dibujarse bajo su pintada, terminando en su borde derecho y creciendo hacia
dentro. SHALL NOT salirse por los lados de la página. Dos firmas que caerían en el mismo sitio
SHALL NOT pisarse: la segunda baja de línea, como mucho ocho veces.

#### Scenario: Pintada pegada al borde derecho
- **WHEN** alguien pinta a 20 px del borde derecho de una página de 1440 px
- **THEN** su firma se lee entera dentro de la página

#### Scenario: Pintada pegada al borde izquierdo
- **WHEN** alguien pinta un punto a 10 px del borde izquierdo
- **THEN** su firma empieza dentro de la página

#### Scenario: Dos firmas en el mismo sitio
- **WHEN** dos visitantes pintan exactamente en el mismo sitio
- **THEN** las dos firmas se leen, una debajo de la otra

### Requirement: Señalar una pintada señala esa pintada
Al señalar un punto de la pared para reportar, SHALL elegirse la firma de la pintada más
reciente que lo cubre. Un punto que no cubre ninguna pintada SHALL NOT señalar a nadie, aunque
quede entre dos pintadas de la misma firma.

#### Scenario: El hueco entre dos pintadas de la misma firma
- **WHEN** «LUNA-7» ha pintado a la izquierda y a la derecha, y alguien señala el centro vacío
- **THEN** no se señala ninguna firma

### Requirement: Las firmas tienen mano
Cada firma SHALL dibujarse con una inclinación y un remate (subrayado, flecha o estrella)
propios, derivados de su texto y por tanto siempre los mismos para esa firma. SHALL seguir
siendo el texto generado, del color del último trazo de su pintada, y SHALL seguir leyéndose.

#### Scenario: La misma firma, la misma mano
- **WHEN** se recarga la página
- **THEN** «LUNA-7» conserva su inclinación y su remate

#### Scenario: La inclinación no vuelca el texto
- **WHEN** se dibuja cualquier firma válida
- **THEN** su inclinación no pasa de 8 grados a un lado ni a otro

### Requirement: Se sabe qué pintó cada firma
En la lista de firmas de la pared, al mover el cursor sobre una firma o llevar el foco a su
botón, sus trazos SHALL destacar y los demás SHALL atenuarse; al quitarlo, la pared SHALL volver
a verse como estaba, también si esa firma desaparece de la pared mientras se mira. SHALL
funcionar con teclado para las firmas ajenas, que son las que tienen botón; la propia se destaca
con el cursor (pintar ya exige puntero). Una lista que se abre bajo un cursor quieto SHALL NOT
atenuar la pared.

#### Scenario: Recorrer la lista con el teclado
- **WHEN** alguien abre la lista de firmas y lleva el foco al botón de «LUNA-7»
- **THEN** lo pintado por «LUNA-7» destaca y el resto se atenúa

#### Scenario: Salir de la lista
- **WHEN** el foco o el cursor sale de la lista
- **THEN** la pared se ve otra vez completa

#### Scenario: La firma que se mira desaparece
- **WHEN** alguien tiene el foco en una firma y la crew borra lo suyo
- **THEN** en la siguiente lectura la pared se ve completa, sin quedarse atenuada
