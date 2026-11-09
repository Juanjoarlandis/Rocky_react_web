# Spec Delta

## Purpose

Que las pintadas del spray del modo neón formen una pared común: lo que pinta un visitante lo
ven todos los que pasan de noche por esa página, firmado con un tag generado y con límites que
protegen la web.

## ADDED Requirements

### Requirement: Lo que se pinta lo ve todo el mundo
Con la pared compartida encendida, cada trazo terminado SHALL guardarse en el servidor y SHALL
verse en el modo neón de esa página para cualquier visitante. Lo que pinten otros mientras
alguien está en la página SHALL aparecer sin recargar en menos de un minuto, mientras la
pestaña esté visible y el modo neón encendido.

Antes del primer trazo, la herramienta del spray SHALL avisar de que lo que se pinta lo verá
todo el que pase de noche.

#### Scenario: Dos visitantes
- **WHEN** Ana pinta un trazo en `/crew` y Berto tiene `/crew` abierta de noche
- **THEN** Berto ve el trazo de Ana en menos de un minuto sin recargar

#### Scenario: Aviso antes de pintar
- **WHEN** alguien coge el spray por primera vez con la pared compartida encendida
- **THEN** la herramienta dice que lo que pinte será visible para todos

### Requirement: Una pared por página y ancho
Cada página SHALL tener dos paredes: una para pantallas anchas (900 px o más) y otra para
estrechas. Un trazo SHALL ir a la pared del ancho en que se pinta, y cada visitante SHALL ver la
pared de su ancho. Solo SHALL aceptarse páginas conocidas de la web: las secciones fijas y las
fichas y páginas de drop con un handle válido.

#### Scenario: Móvil y ordenador
- **WHEN** alguien pinta en `/estudio` desde el móvil
- **THEN** su trazo sale en la pared estrecha de `/estudio` y no en la ancha

#### Scenario: Página inventada
- **WHEN** llega un trazo para una ruta que no es de la web
- **THEN** el servidor lo rechaza

### Requirement: Lo nuevo tapa lo viejo
Los trazos SHALL dibujarse en el orden en que se pintaron, lo más nuevo encima. Cada pared SHALL
tener un tope de pintura: al pasarlo, SHALL borrarse primero lo más antiguo.

#### Scenario: Pared llena
- **WHEN** una pared llega a su tope y alguien pinta un trazo nuevo
- **THEN** el trazo se guarda y desaparecen los trazos más antiguos hasta que la pared vuelve a caber en su tope

### Requirement: Firmas generadas, sin texto libre
Cada visitante SHALL pintar con una firma que genera el servidor con palabras de la crew y un
número, y que es la misma durante su sesión. La firma SHALL dibujarse pequeña junto a lo que ha
pintado en cada pared. Ningún visitante SHALL poder escribir el texto de su firma, ni la pared
SHALL guardar o enseñar datos personales.

#### Scenario: Firma junto a la pintada
- **WHEN** alguien con la firma «LUNA-7» pinta en `/menudrop`
- **THEN** quien ve esa pared lee «LUNA-7» pequeño junto a esa pintada

#### Scenario: Intento de firma propia
- **WHEN** una petición intenta fijar el texto de la firma
- **THEN** el servidor la ignora o la rechaza y la firma sigue siendo la generada

### Requirement: Cada uno manda en lo suyo
«Deshacer» SHALL quitar el último trazo propio de esa pared y «Borrar» SHALL quitar todos los
trazos propios de esa pared. Ninguna de las dos SHALL quitar trazos de otros visitantes.

#### Scenario: Deshacer
- **WHEN** alguien pulsa «Deshacer» después de pintar
- **THEN** desaparece su último trazo para todos y los de los demás siguen

#### Scenario: Borrar trazos ajenos
- **WHEN** una petición intenta borrar un trazo de otra firma
- **THEN** el servidor la rechaza y el trazo sigue

### Requirement: Lo pintado antes sigue siendo privado
Las pintadas guardadas en el navegador antes de este cambio SHALL seguir viéndose solo para
quien las pintó, como hasta ahora, y SHALL NOT subirse nunca al servidor.

#### Scenario: Pintada antigua
- **WHEN** alguien que pintó con la versión anterior vuelve de noche a esa página
- **THEN** ve su pintada antigua, y los demás visitantes no la ven

### Requirement: Límites contra el abuso
El servidor SHALL limitar los trazos por visitante y minuto y la pintura por visitante, pared y
día. También SHALL limitar el tamaño de cada trazo, el número de paredes y el tamaño total del
fichero de la pared. Cada trazo SHALL validarse: color de la paleta, puntos y chorretones dentro
de los límites de la página y formato correcto. Lo que no cumpla SHALL rechazarse con un error
en castellano, sin guardarse.

#### Scenario: Ráfaga
- **WHEN** un mismo visitante manda más trazos por minuto de los permitidos
- **THEN** los que sobran se rechazan con 429 y lo ya pintado sigue

#### Scenario: Trazo deforme
- **WHEN** llega un trazo con un color fuera de la paleta o coordenadas fuera de rango
- **THEN** se rechaza con 400 y no se guarda

### Requirement: Los topes no se pueden inflar
Cada trazo SHALL contar al menos un mínimo de puntos en los topes. El registro de firmas SHALL
tener un tope y olvidar a quien ya no tiene nada pintado. Las paredes de las secciones y de
las páginas legales SHALL NOT borrarse para hacer sitio: solo las de producto compiten por el
tope de paredes.

#### Scenario: Paredes inventadas
- **WHEN** alguien pinta en decenas de páginas de producto inventadas hasta pasar el tope de paredes
- **THEN** solo se van paredes de producto; las de las secciones y las legales siguen intactas

#### Scenario: Trazos de un punto
- **WHEN** alguien manda cientos de trazos de un solo punto a la misma pared
- **THEN** cada uno cuenta el mínimo, la pared se llena antes y se van los más antiguos

### Requirement: Si la pared común no está, el spray sigue
Si la pared compartida está apagada o el servidor no responde, el spray SHALL funcionar como
antes de este cambio, guardando en el navegador. Además SHALL decir que lo pintado no se está
compartiendo. Un trazo que no se haya podido subir SHALL quedarse en el navegador de quien lo
pintó.

#### Scenario: Pared apagada
- **WHEN** la pared compartida está apagada y alguien pinta
- **THEN** el trazo se guarda en su navegador y la herramienta dice que no se comparte

#### Scenario: Fallo al subir
- **WHEN** falla la subida de un trazo
- **THEN** el trazo sigue en la pantalla y en el navegador de quien lo pintó, con un aviso
