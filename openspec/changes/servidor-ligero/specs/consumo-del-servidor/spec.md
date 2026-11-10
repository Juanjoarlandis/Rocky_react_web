# Spec Delta

## Purpose

Acotar la memoria y la CPU que gasta el servidor, en reposo y bajo carga, para que pueda
funcionar con holgura en una máquina pequeña, y comprobar su salud sin gastar más de lo
que gasta sirviendo.

## ADDED Requirements

### Requirement: El servidor aguanta la carga de referencia con 128 MB
En un contenedor limitado a una CPU y 128 MB, el servidor SHALL completar la tanda de
carga de la línea base (`linea-base-fase-4.md`, 4.3, con 20 conexiones) sin que el
contenedor muera, sin peticiones fallidas y con un pico de memoria del contenedor de
100 MB como máximo.

#### Scenario: Tanda de carga con 128 MB
- **WHEN** se ejecuta la tanda completa contra el contenedor limitado a 128 MB
- **THEN** el contenedor sigue vivo (`OOMKilled` falso), no hay peticiones fallidas y el pico de memoria no pasa de 100 MB

#### Scenario: Se repite la tanda
- **WHEN** la tanda se ejecuta tres veces seguidas sobre el mismo contenedor
- **THEN** el pico de la tercera no supera en más de un 10 % al de la primera

### Requirement: El tope de memoria no tumba el proceso
El tope de memoria del proceso SHALL dejar margen para el estado que el servidor guarda
en memoria: con un almacén de 5.000 sesiones y mutaciones continuas, el servidor SHALL
seguir respondiendo sin terminar por falta de memoria.

#### Scenario: Almacén grande bajo mutaciones
- **WHEN** el almacén tiene 5.000 sesiones con carrito y llegan 200 altas de carrito seguidas, en el contenedor de 128 MB
- **THEN** todas responden 200 y el proceso no termina

### Requirement: En reposo el servidor no gasta
Con la sonda de salud activa y sin tráfico, el contenedor SHALL usar 30 MB de memoria
como máximo y un 0,05 % de una CPU como máximo, medido durante 120 s.

#### Scenario: Dos minutos sin tráfico
- **WHEN** el contenedor lleva 120 s sin recibir peticiones, con su sonda de salud activa
- **THEN** ha consumido como mucho 60 ms de CPU y su memoria no pasa de 30 MB

### Requirement: La sonda de salud no lanza un proceso de Node
La sonda del contenedor SHALL comprobar `GET /api/health` sin arrancar otro proceso de
Node, y SHALL dar el contenedor por sano solo si la respuesta es 200.

#### Scenario: Servidor sano
- **WHEN** `/api/health` responde 200
- **THEN** la sonda termina con código 0 y Docker marca el contenedor `healthy`

#### Scenario: Almacén no disponible
- **WHEN** `/api/health` responde 503
- **THEN** la sonda termina con código distinto de 0

#### Scenario: El servidor no escucha
- **WHEN** nadie escucha en el puerto del servidor
- **THEN** la sonda termina con código distinto de 0

### Requirement: La publicación sigue esperando a que el contenedor esté sano
La imagen SHALL conservar una sonda de salud propia, de modo que
`docker compose up --wait` siga terminando bien cuando el servidor arranca y mal cuando
no arranca.

#### Scenario: Arranque correcto
- **WHEN** se arranca el contenedor con `docker compose up --wait`
- **THEN** la orden termina bien y el contenedor figura como `healthy`

#### Scenario: Arranque fallido
- **WHEN** el servidor no puede arrancar, por ejemplo porque la clave no descifra el estado
- **THEN** `docker compose up --wait` termina con error

### Requirement: Lo que el servidor recuerda en memoria tiene tope
Toda estructura en memoria que crece con el tráfico SHALL tener un número máximo de
entradas y descartar las más antiguas al alcanzarlo. En particular, el registro de qué
redes han reportado cada firma de la pared no SHALL crecer sin límite.

#### Scenario: Reportes desde muchas redes
- **WHEN** llegan reportes de firmas distintas hasta superar el tope del registro
- **THEN** el registro no supera su tope y los reportes nuevos se siguen contando
