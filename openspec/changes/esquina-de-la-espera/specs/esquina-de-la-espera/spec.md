# Spec Delta

## Purpose

Que el cartel de un drop anunciado diga cuánta gente se ha apuntado a esperarlo, con un
número real, redondeado y sin sacar nada de la lista de avisos salvo esa cifra.

## ADDED Requirements

### Requirement: El drop anunciado publica sus apuntados en decenas
En `/api/drops`, cada drop en estado anunciado SHALL llevar `waiting` con el número de avisos
pendientes de ese drop y de sus diseños: sin enviar y contando cada email una sola vez,
redondeado a la decena inferior. El campo SHALL aparecer solo cuando ese número redondeado
sea 10 o más, y SHALL valer lo mismo en `drops` y en `featured`.

#### Scenario: 143 apuntados
- **WHEN** el Drop 6 anunciado tiene 143 avisos pendientes de emails distintos
- **THEN** `/api/drops` dice `waiting: 140` en el Drop 6, también en `featured`

#### Scenario: Pocos apuntados
- **WHEN** el Drop 6 anunciado tiene 9 avisos pendientes
- **THEN** el Drop 6 no lleva `waiting`

#### Scenario: El mismo email en el drop y en un diseño
- **WHEN** un email se apuntó al Drop 6 y también a uno de sus diseños
- **THEN** cuenta una sola vez

#### Scenario: Avisos ya enviados
- **WHEN** a 30 de los apuntados ya se les envió el aviso
- **THEN** esos 30 no cuentan

#### Scenario: Un drop a la venta
- **WHEN** un drop está a la venta o en el archivo
- **THEN** no lleva `waiting`, tenga los avisos que tenga

### Requirement: De la lista solo sale el número
La respuesta pública SHALL NOT incluir emails, fechas de alta ni ningún dato por aviso o por
diseño: solo el número redondeado del drop. Los registros del servidor sobre la cuenta SHALL
llevar como mucho un código de error, nunca datos de los avisos.

#### Scenario: Leer la respuesta
- **WHEN** alguien pide `/api/drops` con el Drop 6 anunciado y 143 apuntados
- **THEN** la respuesta solo añade `waiting: 140` y no contiene ningún email

### Requirement: Si la cuenta falla, los drops responden igual
Si contar los avisos falla, `/api/drops` SHALL responder igual que sin esta capacidad, sin
`waiting`, con su estado de siempre.

#### Scenario: El almacén falla al contar
- **WHEN** leer la lista de avisos lanza un error
- **THEN** `/api/drops` responde 200 con los drops, la hora y el destacado, sin `waiting`

#### Scenario: Falla la cuenta de uno de dos anunciados
- **WHEN** hay dos drops anunciados y la lista de uno de ellos no se puede leer
- **THEN** ese drop no lleva `waiting` y el otro conserva su número

#### Scenario: El almacén sigue fallando
- **WHEN** la lista falla y llegan cinco visitas seguidas
- **THEN** se intenta leer una sola vez y queda una sola línea en el registro, y se vuelve a intentar pasados unos segundos

### Requirement: La cuenta se reutiliza un rato
El número de cada drop SHALL calcularse como mucho una vez por minuto, aunque lleguen muchas
peticiones a la vez, y SHALL reflejar los apuntados nuevos al pasar ese minuto.

#### Scenario: Muchas visitas a la vez
- **WHEN** llegan 50 peticiones a `/api/drops` en el mismo segundo
- **THEN** la lista de avisos se lee una sola vez

#### Scenario: Pasa el minuto
- **WHEN** se apuntan 20 personas más y pasa un minuto
- **THEN** la siguiente respuesta ya las cuenta

### Requirement: El Taller y el cartel cuentan igual
El Taller SHALL seguir enseñando los avisos apuntados de cada drop como hoy, sin redondear, y
SHALL contarlos con la misma regla que el número público: pendientes y sin repetir email.

#### Scenario: El mismo drop en los dos sitios
- **WHEN** el Drop 6 tiene 143 avisos pendientes
- **THEN** El Taller dice 143 y el cartel dice 140

### Requirement: El cartel enseña a los que esperan
Si el drop anunciado trae `waiting`, el cartel SHALL decir bajo la cuenta atrás «Ya son N
apuntados esperando en la esquina», como texto que leen los lectores de pantalla, con una
fila de cabecitas de la crew como decoración oculta. Sin `waiting`, el cartel SHALL verse como
hoy.

#### Scenario: Cartel con 140
- **WHEN** el Drop 6 anunciado llega con `waiting: 140`
- **THEN** el cartel dice «Ya son 140 apuntados esperando en la esquina» y las cabecitas no se anuncian

#### Scenario: Cartel sin número
- **WHEN** el Drop 6 anunciado llega sin `waiting`
- **THEN** el cartel se ve como hoy, sin esa línea
