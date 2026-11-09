# Spec Delta

## Purpose

Contar los drops con una pieza visual propia de ROCKY 035: un muro callejero de carteles
pegados en el que cada drop cuenta en qué punto está (anunciado, en la calle, a punto de
irse o ya voló).

## ADDED Requirements

### Requirement: Los drops públicos son carteles en un muro
La página de drops SHALL mostrar cada drop público como un cartel pegado en un muro, en este
orden:
1. los anunciados, el más próximo primero;
2. los que están a la venta;
3. el archivo, del más reciente al más antiguo.

Los carteles del archivo SHALL quedar parcialmente tapados por los más nuevos.

#### Scenario: Cuatro drops en estados distintos
- **WHEN** hay un drop anunciado, uno en la calle, uno en últimas horas y uno en archivo
- **THEN** el muro los pega en ese orden y el del archivo asoma por detrás

### Requirement: El cartel anunciado va tapado con cinta
El cartel de un drop anunciado SHALL enseñar su número y título, su lema y la fecha marcada
con el punto de mira. También SHALL enseñar una cuenta atrás a rotulador y una silueta por
diseño, tapado con tiras de cinta «PRÓXIMAMENTE». SHALL NOT enseñar nombres, fotos ni
precios de los diseños.

#### Scenario: Teaser del Drop 6
- **WHEN** el Drop 6 está anunciado con 5 diseños
- **THEN** su cartel enseña «Drop 6», la fecha en hora de Madrid, la cuenta atrás y 5 siluetas, y ningún nombre de diseño

### Requirement: Las pestañas del cartel apuntan al aviso
El cartel anunciado SHALL llevar pestañas recortables «Avísame». Activar una SHALL
arrancarla y abrir el formulario de aviso de ese drop. Las pestañas SHALL ser botones
accesibles por teclado, con nombre accesible.

#### Scenario: Arrancar una pestaña con el teclado
- **WHEN** se enfoca una pestaña con el tabulador y se pulsa Enter
- **THEN** la pestaña se arranca y aparece el formulario de aviso del drop con el foco en el email

### Requirement: El cartel en la calle invita a entrar
El cartel de un drop en la calle SHALL verse limpio, con el sello «YA EN LA CALLE», hasta
cuatro miniaturas de sus diseños y un enlace a la página del drop.

#### Scenario: Drop recién lanzado
- **WHEN** el Drop 5 está en la calle
- **THEN** su cartel lleva el sello y enlaza a `/products/rocky-drop-5`

### Requirement: El cartel en últimas horas se despega
El cartel de un drop en últimas horas SHALL tener la esquina despegada y una pegatina
«ÚLTIMAS HORAS» con el tiempo que queda.

#### Scenario: Faltan 30 horas
- **WHEN** a un drop en la calle le quedan 30 horas para cerrar
- **THEN** su cartel tiene la esquina levantada y dice que quedan 30 h

### Requirement: El archivo son carteles rotos
El cartel de un drop en archivo SHALL verse roto y apagado, con el sello «VOLÓ». SHALL
enlazar a la página del drop, donde nada se puede comprar.

#### Scenario: Drop cerrado
- **WHEN** el Drop 3 está en archivo
- **THEN** su cartel está roto, dice «VOLÓ» y su página no ofrece compra

### Requirement: La cuenta atrás llega a cero y el cartel cambia solo
Cuando la cuenta atrás de un drop llegue a cero, la web SHALL pedir el estado nuevo y SHALL
cambiar el cartel a «en la calle» sin recargar la página.

#### Scenario: Llega la hora con el muro abierto
- **WHEN** la cuenta atrás del Drop 6 llega a cero
- **THEN** el cartel pierde la cinta y enseña sus diseños

### Requirement: Portada, páginas de drop y cinta del pie cuentan lo mismo
La portada SHALL anunciar el drop destacado con su cuenta atrás o su enlace, en lugar de
un drop fijo. Las secciones del catálogo SHALL seguir el orden del muro, con el anunciado
como cartel teaser. La página de cada drop SHALL encabezarse con su cartel. La cinta del pie
SHALL nombrar el destacado y su fecha o estado.

#### Scenario: Portada con el Drop 6 anunciado
- **WHEN** el Drop 6 es el destacado y está anunciado
- **THEN** la portada enseña «Drop 6» con su cuenta atrás y la cinta del pie dice «DROP 6» con su fecha

### Requirement: El muro respeta la noche y el movimiento reducido
De noche, los carteles SHALL usar la paleta de neón del descontrol. Con movimiento reducido,
ni las pestañas ni las esquinas SHALL animarse. La cuenta atrás SHALL actualizarse como texto,
sin animación.

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide movimiento reducido y se arranca una pestaña
- **THEN** el formulario aparece sin que la pestaña caiga animada

### Requirement: El muro es accesible
La cuenta atrás visual SHALL ocultarse a los lectores de pantalla. En su lugar SHALL haber
un texto con la fecha y la hora completas, que no se anuncie cada segundo. Cada cartel SHALL
tener un encabezado con el nombre del drop. Los textos SHALL cumplir contraste AA de día y
de noche.

#### Scenario: Lector de pantalla en el cartel anunciado
- **WHEN** un lector de pantalla recorre el cartel del Drop 6
- **THEN** oye el nombre del drop, «sale el viernes 13 de noviembre a las 20:00, hora de Madrid» y las pestañas, sin un recuento por segundos

### Requirement: El Pegador empapela el muro
Un personaje nuevo de la crew, El Pegador, SHALL aparecer en el muro pegando el cartel más
reciente. SHALL dibujarse en el estilo de la casa, ser decorativo para la accesibilidad y
pasar a neón de noche.

#### Scenario: Muro de día y de noche
- **WHEN** se abre el muro de día y luego con el descontrol encendido
- **THEN** El Pegador aparece junto al cartel más reciente, de día en sus colores y de noche en neón
