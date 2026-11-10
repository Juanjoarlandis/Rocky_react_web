# La pared compartida del modo neón

Cómo se enciende, se apaga, se limpia y se copia la pared compartida: lo que se
pinta con el spray del modo neón lo ve todo el mundo en esa página. Especificación:
`openspec/changes/pared-compartida-neon/` (capacidades `pared-compartida` y
`moderacion-de-la-pared`).

## Qué guarda

- Una pared por **página y anchura**: `/crew|ancha` y `/crew|estrecha` son paredes
  distintas (el corte está en 900 px), para que lo pintado no se descoloque.
- Cada trazo lleva su **firma generada** (`LUNA-7`) y una **clave de autor**: un hash
  de la sesión con una sal propia de la pared. No hay IP, email, cuenta ni texto
  libre.
- Topes: un tope de puntos por pared (al llenarse salen los trazos más antiguos; cada
  trazo cuenta al menos 20), un tope diario por autor, 40 trazos por minuto y 20
  reportes por hora por cliente, y como mucho 60 paredes de producto (las secciones y
  las legales no cuentan y nunca se borran).
- El registro de firmas tiene un tope de 20 000; quien no tiene nada pintado y lleva un
  día sin pintar se olvida. Con el tope lleno, un autor nuevo recibe «La pared está a
  tope de firmas» (503 `WALL_FULL`).
- **3 reportes** de visitantes distintos ocultan lo de una firma en esa pared, y esa
  firma ya no puede pintar ahí hasta que la crew la revise. Varias sesiones desde la
  misma red (una IPv4, o una IPv6 por su /64) cuentan como un solo visitante; la red
  solo se recuerda en memoria.

Todo vive en memoria y se escribe cifrado en `pared.enc`:

- por defecto junto al almacén de estado (`STATE_STORE_PATH`); en la Raspberry,
  `/var/lib/rocky035/pared.enc`;
- con la misma `APP_ENCRYPTION_KEY` que el estado;
- con escritura diferida: como mucho un minuto después del último cambio, y siempre
  al parar el contenedor (SIGTERM). Un corte de luz puede perder ese último minuto.

## Encender y apagar

La pared está **apagada** salvo que el entorno diga lo contrario:

```bash
# /etc/rocky035/rocky.env
SHARED_WALL_ENABLED=true
# SHARED_WALL_PATH=/app/.data/pared.enc   # solo si se quiere otra ruta
```

Después hay que recrear el contenedor para que lea el entorno
(`docker compose -f compose.production.yaml up -d`, como en `publicar.md`).

Con la variable puesta, **El Taller → La pared** tiene el interruptor:

- **Apagar la pared**: al momento, el servidor deja de aceptar trazos y de servir
  paredes, y el spray de cada visitante vuelve a pintar solo en su navegador. Lo
  pintado no se borra.
- **Encender la pared**: vuelve a servirla tal como estaba.

El estado del interruptor se guarda en `pared.enc`, así que un reinicio respeta lo
último que se eligió. Sin `SHARED_WALL_ENABLED=true` el interruptor no la enciende
(responde `WALL_NOT_CONFIGURED`).

Para apagarla del todo y para siempre, quita la variable y recrea el contenedor.

## Limpiar desde El Taller

En **El Taller → La pared** se ve cada pared con sus trazos, sus firmas y sus
reportes. Al abrir una:

- **Ocultar** / **Mostrar** lo de una firma. Mostrar también borra sus reportes.
- **Borrar lo suyo**: elimina todos los trazos de esa firma en esa pared.
- **Limpiar la pared**: la deja en blanco.

Cada acción exige la sesión de El Taller y deja una línea en el registro
(`Taller`, `action: pared-…`, la pared y la firma), sin sesiones ni claves de autor.

## Decisión pendiente antes de abrir la web

Hoy la moderación es **posterior**: se pinta, se ve al momento y se oculta si hay
reportes o si la crew lo limpia. Mientras la web esté detrás de la puerta de acceso
eso basta, porque solo entra quien tiene el enlace.

**Antes de quitar la puerta de acceso** hay que decidir si se pasa a moderación
previa (que nada se vea hasta que la crew lo apruebe) o si se acepta el riesgo de
que algo feo esté visible hasta que lo tapen los reportes o la crew. Esa decisión es
del cliente; hasta tomarla, la pared no debe encenderse con la web abierta.

En la misma decisión entra un límite que hoy no existe: **firmas nuevas por red y
día**. Con la web abierta, cada petición sin cookie estrena sesión y firma, y desde
varias redes se puede llenar el tope de 20 000 firmas (la pared respondería «a tope de
firmas» a quien llegue nuevo). Con la puerta puesta hace falta su clave.

## Copia y restauración

El almacén de sesiones y créditos (`rocky-state.enc`) agrupa sus escrituras: una copia
hecha con el servidor en marcha puede no llevar los últimos 5 segundos de escrituras
diferidas (sesiones, carritos, votos), nunca un crédito, un aviso ni un cierre de sesión,
que se escriben antes de responder. El fichero copiado siempre es un estado completo.

`scripts/backup-estado.sh` copia un solo fichero. Para la pared, en otra carpeta
(la rotación conserva las 30 últimas y nombra las copias `rocky-state-<fecha>.enc`
aunque sean de la pared):

```bash
sudo ORIGEN=/var/lib/rocky035/pared.enc DESTINO=/var/backups/rocky035/pared scripts/backup-estado.sh
```

La escritura del servidor es atómica (temporal y `rename`), así que copiar en
caliente da un fichero entero.

Para restaurar:

1. Para el contenedor (al parar vuelca la pared actual: si quieres conservarla,
   cópiala antes).
2. Copia la copia elegida sobre `/var/lib/rocky035/pared.enc`, con el mismo dueño
   y permisos que el original.
3. Arranca el contenedor y comprueba en El Taller que la pared está encendida y
   tiene sus trazos.

Solo se puede leer con la misma `APP_ENCRYPTION_KEY`. Si se rota la clave, la pared
antigua deja de leerse (ver «Fichero roto»).

## Fichero roto

Si `pared.enc` no se puede descifrar o leer, el servidor arranca igual con la pared
**apagada** y El Taller la marca como «corrupta». No se toca el fichero hasta que
alguien la vuelve a encender desde El Taller: entonces se aparta como
`pared.enc.corrupto-<fecha>` y la pared empieza en blanco. Si se quiere recuperar,
restaura una copia antes de encenderla.
