## ADDED Requirements

### Requirement: Lo que llega mientras la pared carga espera a la carga
Mientras el servidor lee el fichero de la pared, las peticiones que pintan, deshacen, borran lo
propio o reportan SHALL esperar a que termine la carga y SHALL decidir después si la pared está
activa. Ninguna SHALL responder que la pared está apagada solo porque aún no se ha leído el
fichero, y ninguna SHALL aplicarse antes de leerlo.

#### Scenario: Un trazo durante la carga
- **WHEN** alguien pinta mientras la pared aún está leyendo su fichero, y la pared está encendida
- **THEN** la petición espera a la carga y responde 201 con el trazo, que queda en la pared

#### Scenario: Deshacer, borrar y reportar durante la carga
- **WHEN** alguien deshace un trazo, borra lo suyo o reporta una firma mientras la pared aún está
  leyendo su fichero
- **THEN** la petición espera a la carga y responde como con la pared ya cargada (por ejemplo, 403
  si el trazo no es suyo, 204 y 202)

#### Scenario: La pared resulta apagada tras cargar
- **WHEN** alguien pinta durante la carga y, al terminar, la pared está apagada o su fichero corrupto
- **THEN** la respuesta es 404 `WALL_DISABLED` y no se pinta nada
