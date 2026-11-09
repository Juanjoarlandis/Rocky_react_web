# Spec Delta

## Purpose

Que la pared común se pueda limpiar: los visitantes señalan lo que no pinta ahí, lo más
reportado se oculta solo y la crew limpia o apaga la pared desde El Taller.

## ADDED Requirements

### Requirement: Cualquiera puede reportar una pintada
En el modo neón, cualquier visitante SHALL poder reportar lo que una firma ha pintado en una
pared. Podrá hacerlo señalándolo en la pared o desde una lista accesible de las firmas de esa
pared. Cada visitante SHALL contar una sola vez por firma y pared. El reporte SHALL NOT pedir
datos personales.

#### Scenario: Reportar con el teclado
- **WHEN** alguien abre la lista de firmas de la pared con el teclado y reporta «LUNA-7»
- **THEN** el reporte se registra y se le confirma, sin pedirle ningún dato

#### Scenario: Reportar dos veces
- **WHEN** el mismo visitante reporta otra vez la misma firma en la misma pared
- **THEN** su reporte no cuenta de nuevo

### Requirement: Lo muy reportado se oculta solo
Cuando lo de una firma en una pared reciba 3 reportes de visitantes distintos, SHALL ocultarse
para todos al momento, a la espera de que alguien de la crew lo revise. Quien lo pintó SHALL
NOT poder volver a publicarlo con la misma firma en esa pared mientras siga oculto.

#### Scenario: Tercer reporte
- **WHEN** tres visitantes distintos reportan lo de «LUNA-7» en `/crew`
- **THEN** sus trazos dejan de verse en esa pared para todos

### Requirement: La pared se limpia desde El Taller
El Taller SHALL tener una sección «La pared». Desde ella SHALL poderse:
- ver cada pared con lo que tiene pintado, sus firmas, sus reportes y si algo está oculto;
- ocultar, volver a mostrar o borrar lo de una firma en una pared;
- limpiar una pared entera.

Cada acción SHALL exigir la sesión de El Taller y SHALL quedar en el registro de El Taller, sin
datos personales.

#### Scenario: Borrar una pintada ofensiva
- **WHEN** alguien de la crew borra lo de una firma en `/estudio` desde El Taller
- **THEN** esos trazos desaparecen para todos y la acción queda en el registro

#### Scenario: Sin sesión del Taller
- **WHEN** una petición sin sesión de El Taller intenta borrar o limpiar una pared
- **THEN** se rechaza con 401 y no cambia nada

### Requirement: La pared se puede apagar al momento
El Taller SHALL tener un interruptor que apague y encienda la pared compartida al momento,
sin publicar una release, y que se mantenga al reiniciar el servidor. Con la pared apagada, el
servidor SHALL NOT aceptar trazos ni servir paredes, y el spray SHALL volver al modo local. Sin
la configuración que la activa, la pared compartida SHALL estar apagada.

#### Scenario: Apagado de emergencia
- **WHEN** alguien de la crew apaga la pared desde El Taller
- **THEN** nadie ve la pared común, nadie puede subir trazos y el spray solo guarda en cada navegador

#### Scenario: Sin configurar
- **WHEN** el servidor arranca sin activar la pared compartida
- **THEN** la pared está apagada y el interruptor de El Taller lo indica
