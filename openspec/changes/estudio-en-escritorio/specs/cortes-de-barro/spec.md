# Spec Delta

## Purpose

Tocar en la mesa trozos del tema real BARRO de ASAKO KACO: un banco de pads que convierte la
canción del estudio en un instrumento, algo que solo puede tener esta web.

## ADDED Requirements

### Requirement: Un banco de pads con cortes de BARRO
La mesa SHALL ofrecer un banco de pads «BARRO» junto a Batería, Teclas y Efectos. Sus 16 pads
SHALL tocar cada uno un corte distinto del tema BARRO, con un nombre que diga qué suena (por
ejemplo «Voz 1», «Coro» o «Bajo»).

Cada corte SHALL empezar y acabar dentro de la duración del tema. Los cortes SHALL NOT
cambiar de afinación con el selector de tono.

#### Scenario: Tocar un corte
- **WHEN** el banco BARRO está cargado y alguien pulsa el pad «Coro» o su tecla
- **THEN** suena ese trozo de BARRO desde su inicio y durante su duración

#### Scenario: Repetir el mismo pad
- **WHEN** se vuelve a pulsar un pad mientras su corte aún suena
- **THEN** el corte vuelve a empezar desde el principio, sin superponerse consigo mismo

### Requirement: El audio se carga solo cuando hace falta
El audio de BARRO SHALL descargarse solo al elegir el banco BARRO, y una sola vez por
pestaña. SHALL decodificarse una vez por cada mesa montada: volver a La Colmena lo decodifica
de nuevo, pero no lo vuelve a descargar. Mientras carga, los pads del banco SHALL decir que están cargando y SHALL NOT
sonar. Los demás bancos SHALL seguir funcionando mientras tanto.

#### Scenario: Entrar sin tocar el banco
- **WHEN** alguien usa La Colmena sin elegir el banco BARRO
- **THEN** la mesa no descarga el audio de BARRO

#### Scenario: Primera vez en el banco
- **WHEN** alguien elige BARRO por primera vez
- **THEN** los pads enseñan que están cargando y, al terminar, suenan al tocarlos

### Requirement: Si BARRO no llega, se dice y se puede reintentar
Si la descarga o la decodificación fallan, el banco BARRO SHALL decirlo con un mensaje en
castellano que distinga los dos casos y un botón para reintentar. Los demás bancos, la
rejilla y el transporte SHALL seguir funcionando. Tras pulsar «Reintentar», el foco SHALL
seguir dentro de la mesa.

#### Scenario: Sin conexión
- **WHEN** falla la descarga del audio de BARRO
- **THEN** el banco dice que no se ha podido descargar, ofrece reintentar y la batería sigue sonando

#### Scenario: El navegador no entiende el audio
- **WHEN** el audio llega pero el navegador no lo puede decodificar
- **THEN** el banco dice que el navegador no puede leer el audio de BARRO y reintentar no lo vuelve a descargar

### Requirement: Los cortes se tocan en directo
Los cortes de BARRO SHALL sonar en directo y SHALL NOT grabarse en la rejilla aunque REC esté
encendido. Así el patrón, el enlace para compartir y el ranking mantienen su formato. Con REC
encendido y el banco BARRO elegido, la mesa SHALL avisar de que los cortes no se graban.

#### Scenario: REC con cortes
- **WHEN** REC está encendido y alguien toca cortes de BARRO
- **THEN** los cortes suenan, la rejilla no cambia y la mesa avisa de que no se graban

### Requirement: El texto de la mesa dice la verdad
Con el banco BARRO disponible, la mesa SHALL NOT decir que no usa ningún sample. Su nota
SHALL contar que todo se sintetiza en el navegador menos los cortes de BARRO.

#### Scenario: Nota al pie de la mesa
- **WHEN** se lee la nota del pie de la mesa
- **THEN** dice que los sonidos se cocinan en el navegador salvo los cortes de BARRO
