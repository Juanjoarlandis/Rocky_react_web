# Spec Delta

## Purpose

Publicar en producción solo código que está en el remoto, con una imagen construida y
verificada fuera de la máquina de producción, y con una promoción que comprueba la salud
y vuelve atrás sola si algo falla.

## ADDED Requirements

### Requirement: La imagen se construye en el equipo del operador
Preparar una release SHALL construir su imagen en el equipo desde el que se publica,
para la arquitectura de la máquina de producción, ejecutando allí la instalación de
dependencias, las pruebas y el build. En la máquina de producción no SHALL ejecutarse
ninguno de esos tres pasos.

#### Scenario: Preparación normal
- **WHEN** se prepara una release con `--aplicar`
- **THEN** la imagen se construye en el equipo del operador y en la máquina de producción solo se verifica y se carga

#### Scenario: Equipo de otra arquitectura sin emulación
- **WHEN** el equipo del operador es x86-64, no tiene emulación instalada y producción es ARM64
- **THEN** la construcción termina bien y la imagen resultante es ARM64

#### Scenario: Fallan las pruebas
- **WHEN** las pruebas fallan durante la construcción
- **THEN** la preparación aborta y no sube nada a producción

#### Scenario: Simulacro
- **WHEN** se prepara sin `--aplicar`
- **THEN** se muestran los pasos, incluida la arquitectura de destino, y no se construye ni se sube nada

### Requirement: La imagen llega íntegra
La imagen SHALL viajar con su huella. Antes de cargarla en producción SHALL comprobarse
esa huella; si no coincide, la preparación SHALL abortar sin cargarla y sin dejar el
fichero de la imagen en producción.

#### Scenario: Transferencia correcta
- **WHEN** la huella del fichero recibido coincide con la calculada al exportarlo
- **THEN** la imagen se carga y el fichero de transferencia se borra

#### Scenario: Transferencia dañada
- **WHEN** la huella no coincide
- **THEN** la preparación termina con error, la imagen no se carga y el fichero recibido se borra

### Requirement: Solo se promueve una imagen verificada en producción
Tras cargar la imagen, SHALL comprobarse en la máquina de producción que su
arquitectura es la de esa máquina y que las huellas de los ficheros de la aplicación
dentro de la imagen coinciden con las calculadas al construirla. Promover una release
cuya imagen no ha superado esa comprobación SHALL rechazarse sin tocar nada.

#### Scenario: Imagen correcta
- **WHEN** la arquitectura y todas las huellas coinciden
- **THEN** la release queda marcada como verificada y se puede promover

#### Scenario: Un fichero no coincide
- **WHEN** algún fichero de la aplicación dentro de la imagen tiene otra huella en producción
- **THEN** la preparación termina con error que nombra el fichero, y `promover` rechaza esa release

#### Scenario: Arquitectura equivocada
- **WHEN** la imagen cargada no es de la arquitectura de la máquina
- **THEN** la preparación termina con error y `promover` rechaza esa release

#### Scenario: Release sin verificar
- **WHEN** se intenta promover una release sin marca de verificación
- **THEN** la promoción aborta como precondición no cumplida, sin cambiar nada

### Requirement: Construir en producción es un último recurso explícito
La preparación SHALL poder construir la imagen en la máquina de producción solo si se
pide con una opción expresa, y SHALL avisar de que es el camino de respaldo. Una imagen
construida así SHALL pasar la misma verificación de contenido contra una build del
equipo del operador antes de poder promoverse.

#### Scenario: Camino de respaldo
- **WHEN** se prepara con la opción de construir en producción
- **THEN** la imagen se construye allí, la salida lo avisa y la verificación de contenido se ejecuta igual

#### Scenario: Sin la opción
- **WHEN** se prepara sin esa opción
- **THEN** en producción no se ejecuta ningún `docker build`
