# Spec Delta

## Purpose

Que la web, una vez cargada, gaste CPU solo cuando pasa algo: en reposo, casi nada, y
en sus estados más caros (modo neón y mesa de beats), lo justo para que un móvil
modesto los mueva con soltura y sin calentarse.

## ADDED Requirements

### Requirement: De día la web está quieta
Con la página cargada, de día y sin interacción, el hilo principal SHALL estar ocupado
menos de un 2 % en un móvil con la CPU cuatro veces más lenta.

#### Scenario: Portada en reposo
- **WHEN** la portada lleva diez segundos cargada sin que nadie la toque
- **THEN** la ocupación del hilo principal no llega al 2 %

### Requirement: El modo neón en reposo no recalcula estilos en cada fotograma
Con el modo neón encendido y sin interacción, el hilo principal SHALL estar ocupado un
5 % como máximo en un móvil con la CPU cuatro veces más lenta, y Chrome SHALL usar un 8 %
de un núcleo como máximo en escritorio, suene o no la cinta de noche.

#### Scenario: Neón con su cinta sonando
- **WHEN** se enciende el neón en la portada y se deja diez segundos
- **THEN** la ocupación del hilo principal es del 5 % o menos y los recálculos de estilo no pasan de 100

#### Scenario: Neón con la radio parada
- **WHEN** se para la radio y se deja otros diez segundos
- **THEN** se cumple lo mismo

#### Scenario: El efecto sigue ahí
- **WHEN** se comparan capturas del neón antes y después del cambio
- **THEN** el parpadeo de los títulos, la oscuridad y los muñecos de noche se ven igual

### Requirement: Interactuar con el neón cuesta la mitad
Mover el puntero y hacer scroll con el modo neón encendido SHALL costar, en escritorio,
la mitad o menos de la CPU de Chrome que cuesta en la línea base: 43 % de un núcleo
como máximo al mover el puntero y 74 % al hacer scroll.

#### Scenario: Linterna
- **WHEN** se mueve el puntero seis segundos por la portada en neón
- **THEN** Chrome usa el 43 % de un núcleo o menos

#### Scenario: Scroll
- **WHEN** se recorre la portada en neón
- **THEN** Chrome usa el 74 % de un núcleo o menos

### Requirement: El lienzo del spray solo existe cuando se pinta
De noche, el lienzo del spray no SHALL crearse hasta que el visitante coge el bote o
hasta que hay trazos que enseñar en esa página, y SHALL liberarse al soltarlo si no
queda nada pintado.

#### Scenario: Noche sin spray
- **WHEN** se enciende el neón y no se coge el bote en una página sin trazos
- **THEN** no hay ningún lienzo del spray en el documento

#### Scenario: Página con trazos
- **WHEN** la página tiene trazos propios o de la pared compartida
- **THEN** se ven como hoy

### Requirement: Un solo observador del tema
Saber si es de noche SHALL costar un único observador del tema para toda la página,
sea cual sea el número de componentes que lo consultan.

#### Scenario: Portada
- **WHEN** se carga la portada, con catorce componentes que consultan el tema
- **THEN** hay un solo observador registrado y todos se enteran del cambio al pulsar la bombilla

### Requirement: La mesa de beats solo repinta lo que cambia
Con la mesa sonando, el hilo principal SHALL estar ocupado un 20 % como máximo en un
móvil con la CPU cuatro veces más lenta, y avanzar un paso no SHALL volver a pintar los
controles que no cambian.

#### Scenario: Mesa sonando
- **WHEN** suena un ritmo de fábrica diez segundos
- **THEN** la ocupación del hilo principal es del 20 % o menos, sin tareas de más de 50 ms

#### Scenario: Paso del secuenciador
- **WHEN** el secuenciador avanza un paso
- **THEN** solo cambian la columna que suena, el contador de pasos y el público; los canales, los pads y los controles no se vuelven a pintar

### Requirement: El estudio usa un solo contexto de audio
La mesa de beats y el reproductor del ranking SHALL compartir un único `AudioContext`
por pestaña, y remezclar un beat no SHALL crear otro.

#### Scenario: Mesa y ranking
- **WHEN** se toca la mesa, se escucha un beat del ranking y se pulsa «Remezclar»
- **THEN** solo se ha creado un contexto de audio y nada suena a la vez

### Requirement: El perfil Crew no cambia de identidad sin cambiar de contenido
El perfil Crew que la tienda expone a la aplicación SHALL conservar su identidad entre
renders mientras sus datos no cambien.

#### Scenario: Render sin cambios
- **WHEN** la aplicación se vuelve a pintar sin que cambie el perfil
- **THEN** el objeto del perfil y el de la tienda que lo contiene son los mismos que antes
