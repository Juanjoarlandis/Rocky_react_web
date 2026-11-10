# Spec Delta

## Purpose

Definir qué lleva la imagen con la que corre el servidor en producción y con qué límites
arranca su contenedor, para que ocupe y gaste solo lo que el servidor necesita.

## ADDED Requirements

### Requirement: La imagen solo lleva las dependencias que el servidor usa
El `node_modules` de la imagen de runtime SHALL contener únicamente las dependencias
que importan el servidor y sus scripts de operación, y SHALL ocupar 5 MB como máximo.
Las librerías del cliente no SHALL estar en él.

#### Scenario: Contenido de la imagen
- **WHEN** se inspecciona el `node_modules` de la imagen
- **THEN** no contiene `react`, `react-dom` ni `react-router` y ocupa 5 MB o menos

#### Scenario: La web sigue completa
- **WHEN** arranca un contenedor de esa imagen
- **THEN** sirve la aplicación desde `dist/` y la API responde, con las mismas pruebas en verde que antes del cambio

### Requirement: La imagen se puede construir sin ejecutar código de la arquitectura de destino
La etapa final del `Dockerfile` SHALL limitarse a copiar ficheros y declarar
metadatos, y la etapa de construcción SHALL ejecutarse en la plataforma del equipo que
construye. Una dependencia de producción con binarios nativos SHALL hacer fallar la
comprobación del proyecto.

#### Scenario: Etapa final sin órdenes
- **WHEN** se analiza el `Dockerfile`
- **THEN** no hay ninguna instrucción `RUN` después del último `FROM`

#### Scenario: Entra una dependencia nativa
- **WHEN** las dependencias de producción incluyen un fichero binario nativo
- **THEN** la comprobación del proyecto falla y lo nombra

### Requirement: La imagen conserva las herramientas de la operación
La imagen SHALL seguir incluyendo lo que usan la sonda de salud y los procedimientos
documentados de operación: `sh`, `bash`, `find`, `sort`, `xargs`, `sha256sum` y `node`.

#### Scenario: Comparación de huellas documentada
- **WHEN** se ejecuta sobre la imagen la orden de `docs/ops/publicar.md` que lista las huellas de `dist`, `server`, `shared` y `node_modules`
- **THEN** termina bien

### Requirement: El contenedor de producción tiene límite de memoria
`compose.production.yaml` SHALL arrancar el contenedor con un límite de memoria, sin
intercambio, cuyo valor por defecto es 192 MB y que se puede cambiar desde el fichero de
entorno de la release sin reconstruir la imagen.

#### Scenario: Valor por defecto
- **WHEN** el contenedor arranca sin que el entorno diga nada
- **THEN** `docker inspect` muestra un límite de memoria de 192 MB y el mismo valor como límite de memoria más intercambio

#### Scenario: Valor cambiado desde el entorno
- **WHEN** el fichero de entorno de la release fija otro límite
- **THEN** el contenedor arranca con ese límite

#### Scenario: Carga de referencia dentro del límite
- **WHEN** se ejecuta la tanda de carga de la línea base contra el contenedor arrancado con ese fichero de Compose
- **THEN** el contenedor sigue vivo y no hay peticiones fallidas
