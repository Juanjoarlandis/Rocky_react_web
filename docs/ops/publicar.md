# Publicar una release

Cómo preparar, promover y revertir una release de producción en la Raspberry con las
órdenes del repo (`scripts/release/`). Sustituyen a los `promote.sh` que se escribían a
mano para cada release hasta septiembre de 2026. Especificación:
`openspec/changes/proceso-de-publicacion/` (capacidad `publicacion-de-releases`).

**Todas las órdenes son simulacro por defecto**: sin `--aplicar` solo leen el estado de
la Raspberry y muestran lo que harían. Promover y revertir cambian producción: hazlo solo
con autorización explícita.

## Requisitos

- Node 24 y `rsync` en el equipo desde el que publicas.
- Acceso SSH sin contraseña a la Raspberry con el usuario de despliegue (el que es dueño
  de `/opt/rocky035/releases` y está en el grupo `docker`). `RELEASE_HOST` elige el host
  (por defecto, el alias `raspberry` de `~/.ssh/config`; también vale la IP local).
- Si el alias no llega (por ejemplo, Tailscale desconectado en tu equipo) y estás en la
  misma red que la Raspberry, usa su IP local con el usuario delante:
  `RELEASE_HOST=<usuario>@<ip-local>`. Con una IP, `~/.ssh/config` no aplica el alias: si
  la clave vive en un agente propio (`IdentityAgent`, como el de 1Password), expórtalo en
  `SSH_AUTH_SOCK` para esa orden.
- `RELEASE_ROOT` si la raíz no es `/opt/rocky035` (solo rutas absolutas simples).
- Para `--aplicar` en promover y revertir: `sudo` sin contraseña (`NOPASSWD`) para ese
  usuario, porque el script se lanza con `sudo -n` desacoplado de la sesión. El simulacro
  avisa si `sudo` pide contraseña. Sin `NOPASSWD`, copia el script del simulacro y
  ejecútalo tú en la Raspberry con `sudo bash`.

## Las tres órdenes

```bash
npm run release:preparar -- --etiqueta <nombre> [--aplicar]
npm run release:promover -- --release <id> [--aplicar]
npm run release:revertir -- [--aplicar]
```

### `release:preparar`

1. Exige el árbol de trabajo limpio y publica el commit que está en `HEAD`.
2. Hace `git fetch --prune origin` y exige que alguna rama de `origin` contenga el
   commit (ni otros remotos ni ramas ya borradas cuentan); registra la rama, `main` si
   está.
3. Rechaza el commit si versiona algún `.env*` distinto de `.env.example` y si falla
   `scripts/check-secrets.mjs`.
4. Empaqueta con `git archive` (nombres literales) solo los ficheros del commit que no
   excluye `.dockerignore` (nada de `.git`, `.env*` ni `scripts/release`), calcula
   `SHA256SUMS` y escribe `release.json` (release, imagen, hash del contenido, commit,
   rama, release activa de partida y número de ficheros). Si no reconoce la release
   activa, aborta.
5. Muestra el espacio libre y el número de releases de la Raspberry.
6. Con `--aplicar`: sube la carpeta a `/opt/rocky035/releases/<id>/`, la verifica con
   `sha256sum -c` y construye `rocky035:<id>` (el `Dockerfile` repite tests y build). La
   copia local temporal se borra siempre.

El identificador es `<AAAAMMDDTHHMMSSZ>-<etiqueta>-<8 primeros del hash>`.

### `release:promover`

Lee la release activa (`/opt/rocky035/current`) y el proyecto de Compose del contenedor,
comprueba que la release y su imagen existen y genera el script de promoción. Con
`--aplicar`:

1. guarda el script como `releases/<id>/promover-<marca>.sh`;
2. lo lanza **desacoplado de tu sesión** (`sudo -n setsid -f bash …`) con su salida en
   `releases/<id>/promover-<marca>.log`;
3. sigue ese log desde tu equipo hasta la marca final. Si se corta la conexión, la
   promoción (y, si hace falta, su vuelta atrás) termina igual en la Raspberry: mira el
   log con `ssh raspberry cat /opt/rocky035/releases/<id>/promover-<marca>.log`.

El script:

1. toma un cerrojo (`/opt/rocky035/.promover.lock`) y comprueba que la release y la imagen
   activas son las esperadas, que la nueva imagen existe y que el estado cifrado es un
   fichero normal; si algo falla, **sale con código 2 sin tocar nada**;
2. guarda `compose.env` y el estado cifrado en copias con la marca de la operación
   (`compose.env.pre-<id>-<marca>`, `/var/backups/rocky035/deploy-<id>-<marca>/`);
3. aparta los registros de una promoción anterior de esa misma release
   (`*-hasta-<marca>.txt`) en vez de pisarlos;
4. escribe el selector nuevo de forma atómica, mueve `current` (borrando un
   `current.next` residual) y arranca solo `rocky035` esperando a que esté sano (90 s);
5. si algo falla en cualquier punto, **vuelve atrás solo** y sale con código 1; si la
   propia vuelta atrás falla, lo dice y sale con código 3;
6. al terminar bien, anota la release sustituida en `releases/<id>/anterior.txt` y deja
   `services-before.txt` y `services-after.txt` con el resto de contenedores.

### `release:revertir`

Reactiva la release anotada en `anterior.txt` de la activa, con el mismo script (también
desacoplado). Para releases promovidas antes de estas órdenes, que no tienen
`anterior.txt`, usa la release de partida de su `release.json` y lo avisa. Si no hay
ninguna de las dos, se niega.

## Si algo falla

| Síntoma | Qué significa | Qué hacer |
| --- | --- | --- |
| «no está en el remoto» | El commit no está en ninguna rama de `origin` | Súbelo a GitHub y repite |
| «cambios sin commit» | El árbol no está limpio | Haz commit o descarta los cambios |
| «ya está activa» / «no existe» / «no está construida» | Release o imagen no preparadas | Prepara con `--aplicar` o revisa el id |
| Falla `sha256sum -c` o `docker build` al preparar | La copia o el build fallaron | Borra la carpeta a medias (`rm -rf /opt/rocky035/releases/<id>` como usuario de despliegue) y repite |
| «no se cumplía una precondición» (código 2) | El estado de producción no era el esperado o hay otra promoción en curso | No se ha tocado nada; revisa el log y qué release está activa |
| «se ha restaurado la anterior» (código 1) | La release nueva no quedó sana | Ya está activa la anterior; mira el log y los del contenedor antes de reintentar |
| «LA VUELTA ATRÁS HA FALLADO» (código 3) | No se pudo restaurar sola | Recuperación manual, abajo |
| Se cortó la conexión | La promoción sigue en la Raspberry | Lee su `promover-<marca>.log`; la última línea dice cómo acabó |
| «sudo pide contraseña» | Falta `NOPASSWD` | Ejecuta a mano el script del simulacro con `sudo bash` |

**Recuperación manual** (con `sudo`, en la Raspberry): copia `compose.env.pre-<id>-<marca>`
sobre `compose.env`; apunta `current` a la release anterior con
`ln -sfn /opt/rocky035/releases/<anterior> /opt/rocky035/current`; y arráncala con
`docker compose --env-file /opt/rocky035/compose.env -f /opt/rocky035/current/compose.production.yaml up -d --no-build --no-deps --pull never --wait rocky035`.
El estado cifrado previo está en `/var/backups/rocky035/deploy-<id>-<marca>/`.

## Diferencias con el proceso manual anterior

- El script parte del `promote.sh` manual: en su primera versión, el generado para el caso
  real `20260928T101659Z-crew-noche-16-fe7c1d2a` → `20260929T100641Z-el-toxico-5617951b`
  era idéntico byte a byte salvo el comentario de cabecera. Tras la revisión
  independiente se endureció: `set -E` (un fallo dentro de una función también dispara la
  vuelta atrás), borrado de `current.next` residual, copias por operación, cerrojo,
  mensajes y códigos de salida, comprobación del estado cifrado y `anterior.txt`.
- La ejecución ya no depende de la sesión SSH del operador.
- El paquete incluye 10 ficheros de configuración que el constructor manual dejaba fuera
  (`.editorconfig`, `.env.example`, `.github/`, `.gitignore`, `.nvmrc`, `.prettierignore`,
  `.prettierrc`, `.stylelintrc.json`, `eslint.config.mjs`). No cambian la imagen; se
  incluyen porque la regla es «el commit menos lo que excluye `.dockerignore`». No falta
  ninguno de los ficheros que tenía la release de producción.
- Solo se publica lo que está en GitHub.

## Cómo se ha validado

- Pruebas en `scripts/release/*.test.mjs`: lógica, plantilla, preparar con repos git
  temporales (remotos, ramas borradas, nombres raros), promover y revertir con un doble de
  la Raspberry que solo admite una lista de lecturas, y una prueba que **ejecuta** el
  script con `bash` y un `docker` falso (sana, no sana, estado inesperado, `current.next`
  residual, fallo dentro de `set_current`, re-promoción sin pisar copias).
- Prueba real con Docker en local y `fakeroot` sobre un layout de prueba con imágenes
  sanas y una que nunca pasa el healthcheck.
- Construcción local de la imagen de producción con el `Dockerfile` del proyecto (los
  tests de `scripts/release` necesitan `git`, que la imagen no trae: por eso no entran en
  ella).
- Contra la Raspberry (2026-11-08):
  - `preparar`, `promover` y `revertir` en simulacro, con la Raspberry idéntica antes y
    después (`ls -la /opt/rocky035`, `current`, imagen y arranque del contenedor);
  - primera publicación real con estas órdenes: `20261108T164136Z-menu-movil-9a93b482`
    sobre `20260929T100641Z-el-toxico-5617951b`. Promoción con resultado `ok`, contenedor
    sano y el resto de contenedores de la Raspberry sin cambios.
