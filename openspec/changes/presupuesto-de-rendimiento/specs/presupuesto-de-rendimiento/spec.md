# Spec Delta

## Purpose

Mantener el peso del build y de los recursos de la web dentro de unos límites acordados:
la comprobación del proyecto falla cuando algo los supera, de modo que una regresión de
rendimiento se vea antes de publicarse y cada mejora quede fijada.

## ADDED Requirements

### Requirement: El build de producción no depende del entorno local
`npm run build` SHALL generar el mismo `dist/` de producción exista o no un `.env` en la
raíz del repo y diga lo que diga ese fichero sobre `NODE_ENV`.

#### Scenario: `.env` local que fija el modo de desarrollo
- **WHEN** se ejecuta `npm run build` con un `.env` que contiene `NODE_ENV=development`
- **THEN** el bundle no lleva el runtime de desarrollo de React y coincide con el que se genera sin `.env`

#### Scenario: Sin `.env`
- **WHEN** se ejecuta `npm run build` en una copia limpia del repo
- **THEN** el bundle es el de producción

### Requirement: El JavaScript inicial tiene un límite
La comprobación SHALL medir, comprimido con gzip, todo el JavaScript que `dist/index.html`
carga al abrir cualquier página (el script de entrada y los módulos que precarga) y SHALL
fallar si la suma supera su límite.

#### Scenario: Se supera el límite
- **WHEN** el JavaScript inicial mide más que su límite
- **THEN** la comprobación termina con error y dice la métrica, lo medido y el límite

#### Scenario: Dentro del límite
- **WHEN** el JavaScript inicial mide menos o igual que su límite
- **THEN** esa métrica no produce error

#### Scenario: Un módulo nuevo se precarga
- **WHEN** el build añade a `index.html` un módulo precargado que antes no estaba
- **THEN** su peso cuenta en el JavaScript inicial

### Requirement: El CSS inicial tiene un límite
La comprobación SHALL medir, comprimidas con gzip, las hojas de estilo que enlaza
`dist/index.html` y SHALL fallar si la suma supera su límite.

#### Scenario: Se supera el límite
- **WHEN** el CSS inicial mide más que su límite
- **THEN** la comprobación termina con error y dice la métrica, lo medido y el límite

### Requirement: Los chunks diferidos tienen un límite
La comprobación SHALL fallar si algún chunk de JavaScript que no forma parte de la carga
inicial supera, comprimido con gzip, el límite de chunk diferido.

#### Scenario: Una ruta diferida crece demasiado
- **WHEN** un chunk diferido mide más que el límite
- **THEN** la comprobación termina con error y nombra el fichero

### Requirement: Cada imagen tiene un límite de tamaño y de peso
La comprobación SHALL fallar si alguna imagen de `dist/` tiene un lado mayor que el
límite de píxeles o pesa más que el límite de bytes, salvo que esté declarada como
excepción. Una imagen cuyo formato no se sabe medir SHALL tratarse como error.

#### Scenario: Entra una imagen enorme
- **WHEN** se añade una imagen de 5906 × 5906 px que no está entre las excepciones
- **THEN** la comprobación termina con error y nombra la imagen, sus medidas y el límite

#### Scenario: Entra una imagen demasiado pesada
- **WHEN** se añade una imagen que cumple en píxeles pero pesa más que el límite
- **THEN** la comprobación termina con error y nombra la imagen y su peso

#### Scenario: Formato desconocido
- **WHEN** aparece en `dist/` una imagen de un formato que la comprobación no sabe medir
- **THEN** la comprobación termina con error y no la da por buena

### Requirement: El audio y el peso total por tipo tienen un límite
La comprobación SHALL fallar si una pista de audio supera su límite de peso, salvo
excepción declarada, o si el peso total de las imágenes o del audio de `dist/` supera el
límite de su tipo.

#### Scenario: Pista nueva demasiado pesada
- **WHEN** se añade una pista de audio que pesa más que el límite y no es una excepción
- **THEN** la comprobación termina con error y nombra la pista

#### Scenario: Muchas imágenes pequeñas
- **WHEN** ninguna imagen supera su límite pero el total de imágenes supera el suyo
- **THEN** la comprobación termina con error por el total

### Requirement: Las excepciones tienen techo propio y caducan
Una excepción SHALL nombrar un recurso concreto, el hallazgo o cambio que la justifica y
su propio techo. La comprobación SHALL fallar si el recurso supera ese techo, si ya
cumple los límites generales o si ya no existe.

#### Scenario: La excepción crece
- **WHEN** un recurso declarado como excepción supera el techo de su excepción
- **THEN** la comprobación termina con error

#### Scenario: La excepción ya no hace falta
- **WHEN** un recurso declarado como excepción pasa a cumplir los límites generales
- **THEN** la comprobación termina con error y pide retirar la excepción

#### Scenario: El recurso se ha borrado o renombrado
- **WHEN** una excepción nombra un recurso que ya no está en `dist/`
- **THEN** la comprobación termina con error y pide retirar la excepción

### Requirement: Los límites solo bajan
Cada límite SHALL declarar el objetivo de la fase 4 hacia el que tiende y no SHALL quedar
por debajo de él. Cuando una medida queda más de un 10 % por debajo de su límite, la
comprobación SHALL fallar e indicar el límite nuevo que corresponde.

#### Scenario: Una mejora deja el límite holgado
- **WHEN** el JavaScript inicial baja a menos del 90 % de su límite y el límite no se toca
- **THEN** la comprobación termina con error y propone el límite ajustado a la medida

#### Scenario: El límite ya está en el objetivo
- **WHEN** un límite es igual a su objetivo y la medida está por debajo
- **THEN** esa métrica no produce error, por holgada que quede

#### Scenario: Límite mal declarado
- **WHEN** un límite no tiene objetivo o está por debajo de él
- **THEN** la comprobación termina con un error de configuración

### Requirement: La comprobación forma parte de la verificación del proyecto
`npm run check` SHALL ejecutar la comprobación de presupuesto sobre el `dist/` que acaba
de construir. La salida SHALL listar, en castellano, cada métrica con lo medido, su
límite y su objetivo, y SHALL terminar con código distinto de cero si algo falla.

#### Scenario: Todo dentro de los límites
- **WHEN** se ejecuta `npm run check` y ninguna métrica falla
- **THEN** termina bien y la salida enseña la tabla de métricas

#### Scenario: Varios fallos a la vez
- **WHEN** fallan dos métricas distintas
- **THEN** la salida nombra las dos, no solo la primera

#### Scenario: No hay build o es de desarrollo
- **WHEN** falta `dist/index.html` o el bundle lleva el runtime de desarrollo de React
- **THEN** la comprobación termina con error y dice cuál de las dos cosas pasa, sin medir nada
