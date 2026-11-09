# Spec Delta

## Purpose

La mesa de beats de La Colmena como un instrumento que, en ordenador, cabe en la pantalla: la
rejilla y los pads se tocan a la vez y la mezcla se hace en una consola con un canal por pista.

## ADDED Requirements

### Requirement: En ordenador, rejilla y pads a la vez
Desde 1200 px de ancho, la mesa SHALL repartirse en dos columnas: la rejilla de 16 pasos y los
pads 4×4, una al lado de la otra.

- A 1440×900 SHALL verse a la vez el transporte, la rejilla completa y los 16 pads, sin
  desplazar la página.
- A 1920×1080 SHALL verse además la consola entera.

Por debajo de 1200 px la mesa SHALL mantener la distribución en una columna que tiene hoy.

#### Scenario: Grabar con REC viendo la rejilla
- **WHEN** en una pantalla de 1440×900 alguien enciende REC y toca los pads
- **THEN** ve caer los golpes en la rejilla sin desplazar la página

#### Scenario: Móvil sin cambios
- **WHEN** se abre La Colmena a 375 px o a 900 px
- **THEN** la mesa se ve en una columna como hoy, sin desbordar el ancho de la pantalla

### Requirement: La consola mezcla cada pista
Desde 1200 px, la mesa SHALL tener una consola con un canal por cada una de las 8 pistas y un
canal maestro. Cada canal de pista SHALL tener un fader vertical de volumen, mute, solo y un
vúmetro que se mueva con el sonido de esa pista. El maestro SHALL tener su fader y su
vúmetro.

#### Scenario: Bajar el hi-hat desde la consola
- **WHEN** alguien baja el fader del hi-hat mientras suena el beat
- **THEN** el hi-hat suena más bajo al momento y su vúmetro se mueve menos

#### Scenario: Solo de la caja
- **WHEN** se activa el solo de la caja
- **THEN** solo suena la caja, los vúmetros de las demás pistas se quedan en reposo y la fila de la caja sigue encendida en la rejilla

### Requirement: Un solo estado de mezcla
La consola y los controles de cada fila SHALL leer y cambiar el mismo estado de niveles,
mutes y solos. Ese estado SHALL guardarse en el navegador igual que hoy: lo guardado antes
del cambio SHALL seguir cargándose.

#### Scenario: Volver otro día
- **WHEN** alguien silenció el tom y bajó el bombo en la versión anterior y vuelve con la nueva
- **THEN** la consola enseña el tom silenciado y el bombo bajado

#### Scenario: Pasar de móvil a ordenador
- **WHEN** se silencia una pista en una ventana estrecha y luego se ensancha a 1440 px
- **THEN** la consola la enseña silenciada

### Requirement: La consola se usa con teclado y lector de pantalla
Cada fader SHALL poder moverse con el teclado. Su nombre accesible SHALL incluir la pista, y
su valor SHALL anunciarse. Mute y solo SHALL ser botones con estado pulsado. Los vúmetros
SHALL ser decorativos y SHALL NOT llegar al lector de pantalla. Con movimiento reducido, los
vúmetros SHALL seguir indicando nivel sin animaciones de rebote.

#### Scenario: Fader con el teclado
- **WHEN** se enfoca el fader de la caja con el tabulador y se pulsan las flechas
- **THEN** el volumen de la caja cambia y el lector anuncia «Volumen de Caja» con su valor

### Requirement: Los enlaces y el ranking no cambian
El enlace para compartir un beat, la publicación en el ranking y el «rapéame» de Rocky IA
SHALL usar el mismo formato que hoy. Un enlace creado antes del cambio SHALL abrirse sonando
igual.

#### Scenario: Enlace antiguo
- **WHEN** se abre un enlace `?beat=…&bpm=…&swing=…&tono=…` creado con la versión anterior
- **THEN** la mesa carga el mismo patrón, tempo, swing y tono
