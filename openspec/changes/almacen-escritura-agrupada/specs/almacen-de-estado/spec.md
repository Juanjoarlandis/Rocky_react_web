# Spec Delta

## Purpose

Guardar cifrado en disco el estado del servidor (sesiones, carritos, avisos, perfiles
Crew, beats y tokens) con garantías explícitas: qué queda escrito antes de responder,
qué puede perderse en una caída brusca y cuánto disco cuesta cada operación.

## ADDED Requirements

### Requirement: Una escritura confirmada está en disco cuando termina
Una escritura confirmada SHALL terminar solo cuando su dato está escrito en el fichero
cifrado, de modo que otra instancia del almacén con la misma clave lo lea. Toda
escritura SHALL ser confirmada salvo que quien la hace la declare diferida.

#### Scenario: Escritura sin clase declarada
- **WHEN** se guarda un valor sin indicar clase y, al terminar, otra instancia abre el mismo fichero
- **THEN** la otra instancia lee ese valor

#### Scenario: Escrituras confirmadas a la vez
- **WHEN** veinte escrituras confirmadas se lanzan a la vez
- **THEN** las veinte están en disco cuando terminan y ninguna pisa a otra

### Requirement: Una escritura diferida termina sin esperar al disco
Una escritura diferida SHALL terminar en cuanto el dato es visible para las lecturas
del mismo proceso, y SHALL llegar al fichero en 5 segundos como máximo desde la primera
escritura pendiente.

#### Scenario: Lectura inmediata
- **WHEN** se hace una escritura diferida y a continuación se lee esa clave
- **THEN** la lectura devuelve el valor nuevo aunque el fichero aún no haya cambiado

#### Scenario: Llega al disco sola
- **WHEN** pasan 5 segundos desde una escritura diferida sin ninguna otra operación
- **THEN** otra instancia del almacén lee el valor nuevo

### Requirement: Un volcado sirve a todas las escrituras pendientes
Las escrituras pendientes, diferidas o confirmadas, SHALL compartir volcado: el número
de volcados depende del tiempo transcurrido y no del número de escrituras.

#### Scenario: Ráfaga de escrituras diferidas
- **WHEN** se hacen 200 escrituras diferidas en menos de un segundo
- **THEN** el fichero se reescribe una sola vez

#### Scenario: Una confirmada arrastra a las diferidas
- **WHEN** hay escrituras diferidas pendientes y llega una confirmada
- **THEN** al terminar la confirmada, las diferidas anteriores también están en disco

### Requirement: Solo lo inocuo es diferido
SHALL ser diferido solo lo que se puede volver a crear: abrir y refrescar una sesión,
guardar en ella el carrito o el historial del chat, la idempotencia del carrito, abrir una
transacción de inicio de sesión y los votos y reportes de beats. Todo lo demás SHALL ser
confirmado; en particular, créditos Crew, avisos, tokens de cliente, publicar, retirar u
ocultar un beat, consumir una transacción de inicio de sesión, y cerrar o rotar una sesión
o retirarle un permiso.

#### Scenario: Pedido pagado
- **WHEN** llega un webhook `orders/paid` válido y el servidor responde 200
- **THEN** el crédito ya está en disco

#### Scenario: Cierre de sesión
- **WHEN** un cliente cierra sesión y el servidor responde
- **THEN** la sesión y su token ya no están en el fichero

#### Scenario: Salir del Taller
- **WHEN** alguien sale del Taller y el servidor responde
- **THEN** la retirada del permiso ya está en disco, y un volcado fallido posterior no la deshace

#### Scenario: Reporte que oculta un beat
- **WHEN** llega el reporte que hace que un beat se oculte
- **THEN** el beat oculto ya está en disco al responder

#### Scenario: Añadir al carrito
- **WHEN** un visitante nuevo añade una camiseta y el servidor responde 200
- **THEN** la petición no ha esperado a ningún volcado

### Requirement: El apagado ordenado no pierde nada
Al recibir `SIGTERM` o `SIGINT`, el servidor SHALL dejar de aceptar peticiones y volcar
todas las escrituras pendientes antes de terminar.

#### Scenario: Parada del contenedor
- **WHEN** se hace una escritura diferida y, antes de 5 segundos, el proceso recibe `SIGTERM`
- **THEN** al volver a arrancar, el dato está

### Requirement: Una caída brusca solo pierde escrituras diferidas recientes
Si el proceso muere sin apagado ordenado, el fichero SHALL seguir descifrándose, toda
escritura confirmada ya terminada SHALL conservarse, y solo podrán faltar escrituras
diferidas de los últimos 5 segundos.

#### Scenario: Proceso matado
- **WHEN** se confirma un aviso, se crea una sesión y el proceso recibe `SIGKILL`
- **THEN** al arrancar de nuevo el fichero se descifra, el aviso está y la sesión puede faltar

#### Scenario: Caída en mitad de un volcado
- **WHEN** el proceso muere mientras escribe el fichero
- **THEN** al arrancar se lee el estado del último volcado completo y no quedan temporales del anterior

### Requirement: Si un volcado falla, el almacén vuelve a lo que hay en disco
Cuando un volcado falla, la escritura confirmada que lo esperaba SHALL fallar, el error
SHALL quedar registrado sin datos del estado, y la siguiente operación SHALL partir de
lo que hay en disco.

#### Scenario: El disco no admite escrituras
- **WHEN** falla el volcado de una escritura confirmada
- **THEN** la operación termina con error y una lectura posterior devuelve lo último que quedó escrito

#### Scenario: Falla un volcado diferido
- **WHEN** falla el volcado de escrituras diferidas, sin ninguna petición esperando
- **THEN** queda una línea de error en el log y el servidor sigue atendiendo

### Requirement: Leer no escribe
Una operación de lectura no SHALL reescribir el fichero. En particular, leer el perfil
Crew de un cliente SHALL escribir solo si el perfil no existía o si su nombre visible ha
cambiado.

#### Scenario: Perfil sin cambios
- **WHEN** un cliente con perfil pide `/api/shopify/account/crew` dos veces
- **THEN** la segunda petición no reescribe el fichero

#### Scenario: Primera visita o nombre nuevo
- **WHEN** un cliente pide su perfil por primera vez, o tras cambiar su nombre en Shopify
- **THEN** el perfil se guarda una vez

### Requirement: El disco que gasta una operación está acotado
Mil altas de carrito de visitantes nuevos, una tras otra, SHALL escribir 30 MB como
máximo en total, y el tiempo de cada alta no SHALL crecer con el número de sesiones
guardadas.

#### Scenario: Mil visitantes nuevos
- **WHEN** 1.000 visitantes nuevos añaden una camiseta, uno detrás de otro
- **THEN** el total escrito en disco no pasa de 30 MB

#### Scenario: Latencia con el almacén lleno
- **WHEN** se comparan las altas 1–50 con las 951–1000
- **THEN** la mediana de las últimas no supera el doble de la de las primeras

### Requirement: El fichero y sus lectores no cambian
El formato del fichero cifrado SHALL seguir siendo el mismo: el fichero que hay hoy se
lee sin migrar, la versión anterior del servidor lee el que deje la nueva, y los
scripts de avisos siguen leyendo los avisos ya confirmados.

#### Scenario: Estado existente
- **WHEN** el servidor nuevo arranca con un fichero escrito por la versión anterior
- **THEN** lo descifra y conserva todos sus registros

#### Scenario: Vuelta atrás
- **WHEN** la versión anterior arranca con un fichero escrito por la nueva
- **THEN** lo descifra y conserva todos sus registros

### Requirement: Las operaciones de carrito completadas se recuerdan 15 minutos
Repetir una operación de carrito con el mismo identificador dentro de los 15 minutos
siguientes SHALL devolver la respuesta guardada sin repetirla en Shopify. Pasado ese
plazo, el registro SHALL dejar de ocupar sitio en el almacén.

#### Scenario: Reintento inmediato
- **WHEN** se repite un «añadir al carrito» con el mismo `operationId` un minuto después
- **THEN** responde lo mismo y Shopify no recibe una segunda mutación

#### Scenario: Registro antiguo
- **WHEN** han pasado más de 15 minutos desde una operación completada
- **THEN** su registro ya no está en el fichero tras el siguiente volcado
