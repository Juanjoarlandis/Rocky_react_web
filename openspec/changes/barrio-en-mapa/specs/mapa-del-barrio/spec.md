# Spec Delta

## Purpose

Un mapa de Lacoma, el barrio de ROCKY 035, sobre su plano real: los sitios del barrio que dio el
usuario, quién de la crew vive en cada uno y cómo se va desde ellos a la web, en el 404 y desde el
pie.

## ADDED Requirements

### Requirement: El dibujo es el plano real de Lacoma
El dibujo SHALL seguir el trazado real de Lacoma, dentro del encuadre fijado en `design.md`: sus
calles y sus parques salen de OpenStreetMap, simplificados y redibujados con la línea y los colores
de la casa. El trazado SHALL ir horneado en el componente, y abrir el mapa SHALL NOT pedir teselas
ni datos a ningún servicio de mapas. El dibujo SHALL marcar la estación de metro Lacoma y SHALL ser
decorativo.

#### Scenario: Reconocer el barrio
- **WHEN** alguien de Lacoma mira el mapa
- **THEN** ve el trazado de sus calles, sus parques y el metro Lacoma

#### Scenario: Sin peticiones a servicios de mapas
- **WHEN** se abre el mapa
- **THEN** el dibujo no carga nada de fuera: ni teselas ni imágenes ni datos

### Requirement: El mapa cita a OpenStreetMap
Bajo el dibujo, en el 404 y en el diálogo, SHALL leerse «© colaboradores de OpenStreetMap», con un
enlace a la página de derechos de autor de OpenStreetMap.

#### Scenario: Atribución
- **WHEN** se ve el mapa en el 404 o en el diálogo del pie
- **THEN** bajo el dibujo se lee «© colaboradores de OpenStreetMap»

### Requirement: Los sitios son los cuatro del barrio
El mapa SHALL tener cuatro sitios, los que dio el usuario el 2026-11-11, cada uno en su punto real:
Los bancos de La Salle, el Bar Mundus, el callejón y el kebab. Cada sitio SHALL ser un enlace a
una sección de la web y SHALL decir qué sección abre. Los enlaces SHALL ir en una lista dentro de
una navegación llamada «El mapa de Lacoma». La tarjeta de cada sitio SHALL decir solo su nombre,
la sección y quién vive allí, sin textos sobre los negocios reales.

#### Scenario: Ir desde un sitio
- **WHEN** se pulsa un sitio del mapa
- **THEN** se abre la sección que dice su tarjeta

#### Scenario: Lector de pantalla
- **WHEN** un lector de pantalla llega al mapa
- **THEN** anuncia la navegación «El mapa de Lacoma» con sus cuatro enlaces, cada uno con su
  sección, y no anuncia el dibujo

### Requirement: El mapa se llama Lacoma
El mapa SHALL titularse «Lacoma», con el lema «Dónde vive cada uno de la crew en Lacoma», porque
es el barrio de la marca (dicho por el usuario el 2026-11-11).

#### Scenario: Abrir el mapa
- **WHEN** se abre el mapa desde el pie
- **THEN** el título es «Lacoma» y el lema dice dónde vive cada uno de la crew en Lacoma

### Requirement: Quién vive en cada sitio sale del álbum
Cada sitio SHALL decir quién vive en él: los cromos cuyo «visto en» es la sección que abre, en el
orden del álbum. Si son tres o menos, salen todos; si son más, los dos primeros y «y N más». Los
cromos de las fichas y de las categorías SHALL contar en la sección de la tienda. Cada sitio SHALL
enseñar la cabeza de uno de sus vecinos como decoración.

#### Scenario: Los bancos de La Salle
- **WHEN** se mira el sitio de Los bancos de La Salle
- **THEN** dice «Los Fundadores, El Spray y 7 más» con la cabeza de Los Fundadores

#### Scenario: El Bar Mundus
- **WHEN** se mira el sitio del Bar Mundus
- **THEN** dice «El Portero y El Estrella»

### Requirement: Los cromos sin sitio no salen en el mapa
Los cromos del 404 SHALL ir fuera del mapa. Los de una sección que no tiene sitio SHALL NOT salir
en el mapa. Un cromo sin «visto en» SHALL NOT salir en ningún sitio ni romper el mapa.

#### Scenario: Una sección sin sitio
- **WHEN** un cromo vive en una sección que ningún sitio abre
- **THEN** no sale en el mapa

#### Scenario: Un cromo a medias
- **WHEN** un cromo no tiene «visto en»
- **THEN** no sale en ningún sitio y el resto del mapa se pinta igual

### Requirement: El 404 de día enseña el mapa con «tú estás aquí»
De día, el 404 SHALL enseñar el mapa bajo su texto, con la nota «Tú estás aquí: fuera del mapa,
con El Turista y Rocky, que viven en el 404» y una chincheta en el canto roto. De noche, el 404
SHALL NOT enseñar el mapa.

#### Scenario: 404 de día
- **WHEN** se abre una ruta que no existe de día
- **THEN** bajo «Te has salido del mapa» está el barrio con la nota de que tú estás fuera

#### Scenario: 404 de noche
- **WHEN** se abre una ruta que no existe de noche
- **THEN** no hay mapa: la salida sigue escondida bajo la linterna

### Requirement: El pie abre el mapa en cualquier página
El pie SHALL tener un botón «El mapa de Lacoma» que abre el mapa en un diálogo, de día y de
noche, sin la nota de «tú estás aquí». El diálogo SHALL cerrarse con su botón y con Escape, y en
los dos casos SHALL devolver el foco al botón del pie. Pulsar un sitio SHALL cerrar el diálogo e
ir a él sin devolver el foco al pie. Con Ctrl, ⌘, Mayús o Alt, el sitio se abre aparte y el
diálogo SHALL seguir abierto.

#### Scenario: Abrir y cerrar
- **WHEN** se pulsa «El mapa de Lacoma» en el pie y después Escape
- **THEN** el mapa se abre en un diálogo y al cerrarlo el foco vuelve al botón

#### Scenario: Ir desde el diálogo
- **WHEN** en el diálogo se pulsa el callejón
- **THEN** se cierra el mapa, se abre su sección y el foco no se queda en el pie

#### Scenario: Abrir un sitio aparte
- **WHEN** en el diálogo se pulsa el callejón con Ctrl o ⌘
- **THEN** su sección se abre aparte y el mapa sigue abierto

### Requirement: En el móvil el mapa se lee
En pantallas de hasta 900 px, el dibujo SHALL ir arriba con cada sitio marcado con un número, y
los sitios SHALL ir en una lista debajo con el mismo número: en dos columnas si caben y en una si
no, sin desbordar la página.

#### Scenario: Móvil
- **WHEN** se ve el 404 de día a 375 px
- **THEN** el dibujo ocupa el ancho con los cuatro números, los cuatro sitios van debajo en una
  columna con su número y no hay scroll horizontal
