# Spec Delta

## Purpose

Que el muro de drops parezca una pared de calle empapelada, con restos pegados en los huecos
que dejan los carteles en vez de pared vacía.

## ADDED Requirements

### Requirement: Los huecos del muro tienen restos
Cuando el muro tiene carteles, la pared SHALL llevar restos pegados por detrás de ellos:
jirones de carteles viejos, pegatinas y tags de la casa. Los restos SHALL ser decorativos: no
reciben foco, no se anuncian al lector, no tapan ningún cartel y no ensanchan la página. SHALL
respetar el modo neón.

#### Scenario: Ordenador
- **WHEN** se abre el muro a 1440 px con cuatro carteles
- **THEN** en los huecos de pared entre carteles se ven restos pegados, y todos los carteles quedan por encima

#### Scenario: Lector de pantalla y teclado
- **WHEN** se recorre el muro con el tabulador o con un lector
- **THEN** los restos no aparecen

#### Scenario: Móvil
- **WHEN** se abre el muro a 375 px
- **THEN** la página no se desplaza en horizontal

#### Scenario: Muro sin carteles
- **WHEN** no hay drops que enseñar
- **THEN** se ve el aviso de muro vacío, sin restos
