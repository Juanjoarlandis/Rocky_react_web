# Spec Delta

## Purpose

Garantizar que lo que se publica en producción sale de un commit conocido del repositorio
remoto, sin secretos, y que cada promoción se puede verificar y revertir.

## ADDED Requirements

### Requirement: Solo se publica código que existe en el remoto
Preparar una release SHALL exigir un commit que esté contenido en alguna rama de `origin`
y un árbol de trabajo sin cambios; si no se cumple, la preparación SHALL abortar sin
crear nada y explicar por qué.

#### Scenario: Commit subido
- **WHEN** se prepara una release desde un commit contenido en `origin/<rama>` con el árbol limpio
- **THEN** se crea la release y su `release.json` registra el commit completo y la rama remota

#### Scenario: Commit solo local
- **WHEN** se prepara una release desde un commit que no está en ninguna rama de `origin`
- **THEN** la preparación aborta antes de crear ficheros y el mensaje dice que el commit no está en el remoto

#### Scenario: Árbol con cambios
- **WHEN** el árbol de trabajo tiene cambios sin commit
- **THEN** la preparación aborta y lista los ficheros modificados

### Requirement: La release no contiene secretos ni historial
El paquete de una release SHALL contener solo los ficheros versionados del commit, sin
`.git`, sin ficheros `.env*` (salvo `.env.example`) y sin lo excluido por `.dockerignore`,
y SHALL incluir `SHA256SUMS` de todos sus ficheros y un `release.json` con el
identificador, la etiqueta de imagen, el commit, la rama, el hash del contenido, el número
de ficheros y la release de producción de partida.

#### Scenario: Contenido verificable
- **WHEN** se prepara una release
- **THEN** `SHA256SUMS` cubre todos los ficheros del paquete y `release.json` contiene los siete campos

#### Scenario: Secreto en el árbol
- **WHEN** el commit contiene un fichero `.env` distinto de `.env.example` o el escáner de secretos del proyecto falla
- **THEN** la preparación aborta sin subir nada

### Requirement: Promoción con salud y vuelta atrás automática
Promover una release SHALL comprobar antes que la release y la imagen anteriores son las
activas, guardar el selector y el estado cifrado, activar la nueva imagen y esperar a que
el contenedor esté sano; si la activación o la espera fallan, SHALL restaurar el selector,
el enlace `current` y la imagen anteriores y terminar con error. La promoción SHALL afectar
solo al contenedor `rocky035`.

#### Scenario: Release sana
- **WHEN** se promueve una release cuya imagen arranca y pasa el healthcheck
- **THEN** `current` apunta a la release nueva, el contenedor queda `healthy` y los demás contenedores no cambian

#### Scenario: Release que no arranca
- **WHEN** el contenedor de la release nueva no queda sano en el tiempo de espera
- **THEN** se restauran el selector, `current` y la imagen anteriores, el contenedor anterior queda sano y la orden termina con error

#### Scenario: Estado inesperado
- **WHEN** la release o la imagen activas no son las que la promoción espera como anteriores
- **THEN** la promoción aborta sin tocar nada

### Requirement: Simulacro y registro
Preparar, construir, promover y revertir SHALL tener un modo simulacro que muestre los
pasos y las comprobaciones sin ejecutar cambios, y cada promoción real SHALL dejar en la
carpeta de la release el estado de los demás contenedores antes y después.

#### Scenario: Simulacro
- **WHEN** se ejecuta cualquiera de las órdenes en modo simulacro
- **THEN** se muestran los comandos que se ejecutarían y no cambia ningún fichero ni contenedor

#### Scenario: Registro de promoción
- **WHEN** termina una promoción real
- **THEN** la carpeta de la release contiene `services-before.txt` y `services-after.txt`

### Requirement: Vuelta atrás manual
Revertir SHALL reactivar la release anterior registrada con el mismo procedimiento de
salud, y SHALL negarse si no hay release anterior registrada.

#### Scenario: Revertir a la anterior
- **WHEN** se revierte con una release anterior registrada
- **THEN** la release anterior queda activa y sana

#### Scenario: Sin anterior
- **WHEN** se revierte sin release anterior registrada
- **THEN** la orden aborta sin cambios
