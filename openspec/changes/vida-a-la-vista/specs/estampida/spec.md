# Spec Delta

## Purpose

Cómo se llama a la crew para que cruce la pantalla en estampida: tecleando el secreto, desde el
pie con cualquier puntero o cuando cae un drop con la página abierta.

## ADDED Requirements

### Requirement: Teclear «035» sigue llamando a la crew
Teclear «0», «3» y «5» seguidos fuera de un campo de texto SHALL seguir lanzando la Estampida,
como hoy, y SHALL NOT lanzarla mientras está la intro.

#### Scenario: Teclear el secreto
- **WHEN** alguien teclea «035» en la portada, sin estar escribiendo en un campo
- **THEN** la crew cruza la pantalla en estampida

### Requirement: El pie tiene un botón para llamar a la crew
El dibujo de Los del Banco del pie SHALL ser un botón con el nombre accesible «Llamar a la
crew». Activarlo con ratón, dedo o teclado SHALL lanzar la Estampida, y el dibujo SHALL verse
en el mismo sitio y con el mismo tamaño que hoy, de día y de noche.

#### Scenario: Tocar a Los del Banco en el móvil
- **WHEN** en un móvil se toca el dibujo de Los del Banco del pie
- **THEN** la crew cruza la pantalla en estampida

#### Scenario: Con teclado
- **WHEN** se llega con Tab al botón «Llamar a la crew» y se pulsa Intro
- **THEN** la crew cruza la pantalla en estampida y el foco sigue en el botón

#### Scenario: Llamar otra vez
- **WHEN** se activa el botón mientras la crew aún está cruzando y otra vez cuando ya se ha ido
- **THEN** la primera llamada no apila otra estampida encima y la segunda lanza una nueva, como con «035»

### Requirement: La crew celebra la caída de un drop
Si la página está abierta cuando un drop anunciado pasa a estar a la venta y el servidor lo
confirma, la Estampida SHALL cruzar la pantalla una sola vez por esa caída. El cierre de un
drop a la venta y los repasos del catálogo que siguen a la caída SHALL NOT lanzarla.

#### Scenario: Cae el drop con la página abierta
- **WHEN** llega la hora de un drop anunciado y el servidor ya lo da a la venta
- **THEN** la crew cruza la pantalla una vez y el catálogo se recarga como hoy

#### Scenario: Repasos del catálogo
- **WHEN** tras la caída se vuelve a pedir el catálogo a los 5, 15 y 35 s
- **THEN** no sale ninguna estampida más

#### Scenario: Cierre de un drop
- **WHEN** llega la hora de cierre de un drop a la venta
- **THEN** el catálogo se recarga como hoy y no sale la estampida

#### Scenario: El servidor aún no ha cambiado
- **WHEN** llega la hora pero el servidor tarda y responde a los reintentos
- **THEN** la estampida sale una sola vez, cuando el servidor confirma la caída
