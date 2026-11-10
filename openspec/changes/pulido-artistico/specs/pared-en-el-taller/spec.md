# Spec Delta

## Purpose

Que la sección «La pared» de El Taller se vea terminada y deje a la crew saber qué ha pintado
cada firma antes de ocultarla o borrarla.

## ADDED Requirements

### Requirement: Las secciones de El Taller son botones de la casa
El conmutador «Drops / La pared» SHALL verse con los botones de la web, con la sección activa
marcada, se haya visitado antes o no cualquier otra página. SHALL NOT depender de estilos que
solo carga otra página.

#### Scenario: Entrar directo a El Taller
- **WHEN** alguien abre `/taller` sin haber pasado por el Estudio
- **THEN** «Drops» y «La pared» se ven como botones de la web y se distingue cuál está activo

### Requirement: Los rótulos de El Taller van en mayúsculas
Los títulos de sección y de cada pared SHALL rotularse en mayúsculas, como el resto de rótulos
de la web.

#### Scenario: Título de la pared
- **WHEN** se abre «La pared»
- **THEN** se lee «LA PARED» y «/ESTUDIO · ANCHA», sin mezclar mayúsculas y minúsculas

### Requirement: La vista previa enseña qué pintó cada firma
Al poner el cursor o el foco sobre una firma de la lista, la vista previa de la pared SHALL
destacar sus trazos y atenuar los demás; al quitarlo SHALL volver a verse entera. SHALL
funcionar con teclado.

#### Scenario: Antes de borrar
- **WHEN** alguien lleva el foco al botón «Ocultar» de «LUNA-7»
- **THEN** la vista previa destaca lo pintado por «LUNA-7»

#### Scenario: Salir de la fila
- **WHEN** el foco o el cursor sale de la fila de esa firma
- **THEN** la vista previa vuelve a enseñar toda la pared
