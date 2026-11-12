## ADDED Requirements

### Requirement: El cromo girado enseña su expediente en cualquier navegador
Al girar un cromo del álbum SHALL verse su reverso (el expediente) al derecho, sin nada de la cara
de delante, en Chrome y en Firefox, de día y de noche, y también si el cromo ya lleva el sello
«FICHADO». Lo que va dentro de una cara (sellos, mezclas de tinta, capas con `z-index`) SHALL
quedarse dentro de esa cara.

#### Scenario: Un cromo ya fichado en Firefox
- **WHEN** en Firefox se gira un cromo que ya lleva el sello «FICHADO»
- **THEN** se ve el expediente al derecho y el sello no se transparenta

#### Scenario: El cromo especial y el de brillo
- **WHEN** se giran Los Fundadores, cuyo sello no mezcla, o un cromo con brillo
- **THEN** se ve su expediente al derecho, sin el sello de delante

### Requirement: Ninguna cara de un giro 3D deja escapar sus capas
Toda regla de las hojas de estilo que oculte el reverso de una cara (`backface-visibility: hidden`)
SHALL aislar sus capas (`isolation: isolate`), para que una mezcla o un `z-index` de dentro no
aplane el giro ni se pinte fuera de su cara.

#### Scenario: Una cara nueva sin aislar
- **WHEN** una hoja de estilo añade una cara con `backface-visibility: hidden` sin `isolation: isolate`
- **THEN** la prueba de contrato del giro 3D falla y nombra la hoja, la línea y el selector
