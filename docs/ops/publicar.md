# Publicar una release

Cómo preparar, promover y revertir una release de producción en la Raspberry con las
órdenes del repo (`scripts/release/`). Sustituyen a los `promote.sh` que se escribían a
mano para cada release hasta septiembre de 2026. Especificación:
`openspec/changes/proceso-de-publicacion/` y `openspec/changes/despliegue-ligero/`
(capacidades `publicacion-de-releases` e `imagen-de-produccion`).

**La imagen se construye en tu equipo, no en la Raspberry** (desde noviembre de 2026):
allí ya no se instalan dependencias ni se ejecutan pruebas ni builds. La imagen viaja
hecha, con su huella, y solo se puede promover si en la Raspberry resulta ser de su
arquitectura y lleva dentro los mismos ficheros que al construirla.

**Todas las órdenes son simulacro por defecto**: sin `--aplicar` solo leen el estado de
la Raspberry y muestran lo que harían. Promover y revertir cambian producción: hazlo solo
con autorización explícita.

## Requisitos

- Node 24 y `rsync` en el equipo desde el que publicas.
- **Docker con `buildx`** en ese mismo equipo (`docker buildx version`). No hace falta
  emulación (QEMU): la etapa de build del `Dockerfile` corre en la plataforma de tu
  equipo y la de runtime solo copia ficheros, así que desde un x86-64 sale una imagen
  ARM64. Hacen falta unos 600 MB libres mientras dura la preparación (la imagen y su
  copia comprimida, que se borran al terminar).
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
5. Muestra el espacio libre, el número de releases y la arquitectura de la Raspberry
   (`uname -m`), y comprueba que tu Docker tiene `buildx`.
6. Con `--aplicar`:
   1. **construye `rocky035:<id>` en tu equipo** desde ese paquete (no desde tu árbol de
      trabajo) con `docker buildx build --platform linux/<arquitectura> --load`: aquí
      corren `npm ci`, las pruebas y el build. Si algo falla, no se sube nada;
   2. saca de la imagen, sin ejecutarla, las huellas de todo lo que hay en `/app` y la del
      binario de Node de la imagen base, `/usr/local/bin/node` (`IMAGEN-SHA256SUMS`), y la
      exporta con `docker save | gzip` a `imagen.tar.gz`, con su
      `sha256` en `imagen.tar.gz.sha256`;
   3. sube la carpeta a `/opt/rocky035/releases/<id>/` y verifica el código
      (`sha256sum -c SHA256SUMS`) y la imagen recibida (`sha256sum -c imagen.tar.gz.sha256`).
      Si la imagen no llegó íntegra, borra el fichero y aborta sin cargarla;
   4. la carga con `docker load` y borra `imagen.tar.gz` (unos 100 MB). El fichero se
      borra también si algo falla antes: no se queda en la tarjeta;
   5. **comprueba en la Raspberry** que la imagen cargada es de su arquitectura, que es la
      misma que se construyó (las mismas capas y el mismo arranque: entrada, orden, entorno,
      usuario, carpeta y sonda) y que las huellas de `/app` y del binario de Node, leídas
      dentro de ella, son las de `IMAGEN-SHA256SUMS`. Si un solo fichero difiere, falta o
      sobra, termina con un error que lo nombra. No se compara el identificador de la
      imagen entre las dos máquinas: cada Docker lo calcula a su modo;
   6. deja la marca `imagen-verificada.txt` en la carpeta de la release (identificador de la
      imagen, arquitectura y número de ficheros). Sin ella, `promover` se niega.

   La copia local temporal y la imagen de tu Docker se borran siempre.

El identificador es `<AAAAMMDDTHHMMSSZ>-<etiqueta>-<8 primeros del hash>`.

**Último recurso**: si tu equipo no puede construir, `--construir-en-produccion` (con
`--aplicar`) hace el `docker build` en la Raspberry, como antes. La salida lo avisa, y la
imagen pasa la misma comprobación de huellas contra una build de tu equipo (que sigue
haciendo falta para calcularlas). Sin esa opción no se ejecuta ningún `docker build` en
producción.

### `release:promover`

Lee la release activa (`/opt/rocky035/current`) y el proyecto de Compose del contenedor,
comprueba que la release y su imagen existen y que la release tiene su marca de
verificación (`imagen-verificada.txt`), y genera el script de promoción. Con `--aplicar`:

1. guarda el script como `releases/<id>/promover-<marca>.sh`;
2. lo lanza **desacoplado de tu sesión** (`sudo -n setsid -f bash …`) con su salida en
   `releases/<id>/promover-<marca>.log`;
3. sigue ese log desde tu equipo hasta la marca final. Si se corta la conexión, la
   promoción (y, si hace falta, su vuelta atrás) termina igual en la Raspberry: mira el
   log con `ssh raspberry cat /opt/rocky035/releases/<id>/promover-<marca>.log`.

El script:

1. toma un cerrojo (`/opt/rocky035/.promover.lock`) y comprueba que la release y la imagen
   activas son las esperadas, que la nueva imagen existe, **que es la misma imagen que se
   verificó al prepararla** (el identificador de la marca frente al de la etiqueta) y que
   el estado cifrado es un fichero normal; si algo falla, **sale con código 2 sin tocar
   nada**;
2. guarda `compose.env` y el estado cifrado en copias con la marca de la operación
   (`compose.env.pre-<id>-<marca>`, `/var/backups/rocky035/deploy-<id>-<marca>/`);
3. aparta los registros de una promoción anterior de esa misma release
   (`*-hasta-<marca>.txt`) en vez de pisarlos;
4. escribe el selector nuevo de forma atómica (conservando `ROCKY_MEM_LIMIT` si el
   anterior lo fijaba), mueve `current` (borrando un `current.next` residual) y arranca
   solo `rocky035` esperando a que esté sano (90 s). Después comprueba que lo que corre
   es la imagen verificada; si no, vuelve atrás;
5. si algo falla en cualquier punto, **vuelve atrás solo** y sale con código 1; si la
   propia vuelta atrás falla, lo dice y sale con código 3;
6. al terminar bien, anota la release sustituida en `releases/<id>/anterior.txt` y deja
   `services-before.txt` y `services-after.txt` con el resto de contenedores.

### Límite de memoria

El contenedor arranca con un tope de 192 MB, sin intercambio (`compose.production.yaml`).
Para cambiarlo sin reconstruir, añade una línea a `/opt/rocky035/compose.env` (con `sudo`)
y recrea el contenedor:

```
ROCKY_MEM_LIMIT=256m
```

Vale un número con `b`, `k`, `m` o `g` (sin decimales). La promoción conserva esa línea;
si no tiene esa forma, la descarta, lo avisa en el log y el contenedor arranca con 192 MB.
Volver a una release anterior a noviembre de 2026 la deja sin límite: su Compose no lo
tiene.

### `release:revertir`

Reactiva la release anotada en `anterior.txt` de la activa, con el mismo script (también
desacoplado). No exige la marca de verificación: la release anterior ya estuvo en
producción, y las de antes de noviembre de 2026 no la tienen. Para releases promovidas antes de estas órdenes, que no tienen
`anterior.txt`, usa la release de partida de su `release.json` y lo avisa. Si no hay
ninguna de las dos, se niega.

## Si algo falla

| Síntoma | Qué significa | Qué hacer |
| --- | --- | --- |
| «no está en el remoto» | El commit no está en ninguna rama de `origin` | Súbelo a GitHub y repite |
| «cambios sin commit» | El árbol no está limpio | Haz commit o descarta los cambios |
| «ya está activa» / «no existe» / «no está construida» | Release o imagen no preparadas | Prepara con `--aplicar` o revisa el id |
| «Docker con buildx no está disponible» | Tu equipo no puede construir para otra plataforma | Instala o actualiza Docker; `docker buildx version` tiene que responder |
| La construcción falla al descargar la imagen base con `error getting credentials` | El ayudante de credenciales de tu Docker está roto (`credsStore` en `~/.docker/config.json`) | La imagen base es pública: construye con una configuración vacía, `DOCKER_CONFIG=$(mktemp -d) npm run release:preparar -- …` |
| «La construcción de rocky035:… ha fallado» | Fallaron `npm ci`, las pruebas o el build en tu equipo | No se ha subido nada. Arréglalo y repite |
| «no ha llegado íntegra» | El fichero de la imagen se dañó al subir | No se ha cargado y el fichero ya se ha borrado. Repite la preparación |
| «no lleva en producción los mismos ficheros que al construirla: no coincide ./…» | La Raspberry lee ese fichero distinto de como se escribió (ver «Ficheros corruptos en la Raspberry») | La release no tiene marca y no se puede promover. Reinicia la Raspberry con autorización y repite la preparación |
| «es amd64 y la máquina de producción es arm64» (o al revés) | La imagen se construyó para otra arquitectura | Repite la preparación; si persiste, mira qué responde `uname -m` en la Raspberry |
| «no está verificada (falta imagen-verificada.txt)» al promover | La release se preparó a medias, o a mano | Prepárala otra vez con `--aplicar`. No escribas la marca a mano: el script compara su identificador con el de la imagen |
| Falla `sha256sum -c SHA256SUMS` al preparar | La copia del código llegó dañada | Borra la carpeta a medias (`rm -rf /opt/rocky035/releases/<id>` como usuario de despliegue) y repite |
| Con `--construir-en-produccion`, el build revienta con «Segmentation fault» (código 139), o sus pruebas fallan con `FATAL ERROR: DateTimePatternGeneratorCache::CreateGenerator Allocation failed`, «Icu error» o un `SyntaxError` dentro de `node_modules`, y en tu equipo pasan | La Raspberry tiene en memoria copias dañadas de ficheros que en la tarjeta están bien (visto el 9 y el 10 de noviembre de 2026) | Sigue «Ficheros corruptos en la Raspberry», abajo. Construir sin caché no basta si lo dañado es la imagen base |
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

## Ficheros corruptos en la Raspberry

Desde que la imagen se construye en tu equipo, esto ya no impide publicar: la Raspberry
solo carga la imagen y comprueba sus huellas, y si lee mal un fichero de `/app` o el
binario de Node la preparación lo dice y no deja promover. Lo que no se compara es el
resto de la imagen base (las bibliotecas del sistema): si lo dañado estuviera ahí, la
señal sería un contenedor que no arranca sano, y la promoción volvería atrás sola. Sigue siendo lo primero que mirar si esa comprobación falla o si
se usa el último recurso de construir allí.

El síntoma es un build que revienta de una forma distinta en cada intento con código que
en tu equipo pasa: un «Segmentation fault», un `SyntaxError` en una dependencia, errores
de `Intl`. La causa vista hasta ahora: la Raspberry guarda en memoria (su caché de
páginas) una copia dañada de algún fichero que en la tarjeta está bien. Todo proceso nuevo
usa la copia dañada, también dentro del contenedor de producción.

### Cómo comprobarlo

Son órdenes de solo lectura. Compara la lectura normal de un fichero con su lectura
directa del disco, que se salta la caché. Con el binario de Node de la imagen base (la
del `FROM` del `Dockerfile`):

```bash
docker run --rm --entrypoint sh <imagen-base> -c \
  'sha256sum /usr/local/bin/node; dd if=/usr/local/bin/node iflag=direct bs=1M 2>/dev/null | sha256sum'
```

Si las dos huellas difieren, la copia en memoria está dañada. La buena es la del disco:
se puede contrastar con el `bin/node` del paquete oficial de esa versión
(`https://nodejs.org/dist/v<versión>/node-v<versión>-linux-arm64.tar.xz`, que trae su
`SHASUMS256.txt`). El 10 de noviembre de 2026 eran `d18f6217…` en memoria frente a
`3e53e5ff…` en el disco y en nodejs.org.

Otra señal rápida, en el contenedor de producción:

```bash
docker exec rocky035 node -e "console.log(new Intl.DateTimeFormat('es-ES', { dateStyle: 'full' }).format(new Date()))"
```

Con la copia dañada revienta con ese mismo `FATAL ERROR`. La orden solo mata su propio
proceso. El servidor no usa `Intl` (ni en `server/` ni en `shared/`), así que sigue sano
mientras tanto, pero no se puede construir ninguna imagen.

### Cómo arreglarlo

Hay que vaciar esa memoria, y eso es un cambio en la máquina de producción: solo con
autorización explícita.

- **Reiniciar la Raspberry** lo arregla seguro. Corta un par de minutos todo lo que corre
  en ella, no solo ROCKY.
- Antes de reiniciar, apunta lo que está en marcha (`docker ps --format '{{.Names}}'`) y
  compáralo después: los contenedores sin política de reinicio no vuelven solos y hay que
  arrancarlos con `docker start`, las bases de datos primero.
- Vaciar solo la caché (`sync && sudo sysctl vm.drop_caches=3`) no corta nada, pero no
  está probado aquí y puede no bastar si algún proceso tiene esas páginas en uso.

Después:

1. Repite la comprobación: las dos huellas tienen que coincidir.
2. La carpeta de la release que ya subiste sigue valiendo. Compruébala
   (`cd /opt/rocky035/releases/<id> && sha256sum -c --quiet SHA256SUMS`) y construye la
   imagen sin caché, para reinstalar las dependencias con la memoria limpia:
   `docker build --no-cache -t rocky035:<id> /opt/rocky035/releases/<id>`.
3. Compara la imagen con una build limpia antes de promoverla (siguiente apartado).

Si vuelve a pasar con la máquina recién reiniciada, sospecha de la memoria RAM o de la
tarjeta.

### Comparar la imagen con una build limpia

`release:preparar` hace ya esta comparación sola, con todo `/app` y contra la imagen que
construyó tu equipo. Lo que sigue es el procedimiento a mano, por si hay que repetirlo
sobre una imagen ya cargada o construida en la Raspberry.

Una build que termina bien también puede llevar un fichero dañado. Para descartarlo:

1. En tu equipo, en una carpeta aparte y vacía: `git archive <commit> | tar -x -C <carpeta>`
   y, dentro, `npm ci` y `npx vite build`. No sirve el `dist/` del árbol de trabajo: el
   `.env` local cambia la build.
2. Saca las huellas de la imagen:

   ```bash
   docker run --rm --entrypoint sh rocky035:<id> -c \
     'cd /app && find dist server shared node_modules -type f ! -name "*.node" -print0 | sort -z | xargs -0 sha256sum'
   ```

   y las de la carpeta local con el mismo `find … | xargs -0 sha256sum`.
3. Compara las dos listas. Tienen que coincidir todos los ficheros que están en los dos
   lados salvo `node_modules/.package-lock.json`, que cambia porque la imagen quita las
   dependencias de desarrollo. En la imagen sobra además el fichero de resultados de las
   pruebas (`node_modules/.vite/vitest/…/results.json`). Los binarios nativos (`*.node`)
   no se comparan: son de otra arquitectura.
4. Desde `despliegue-ligero`, el `node_modules` de la imagen ya no lleva `react`,
   `react-dom`, `react-router`, `scheduler` ni `cookie-es` (son del build del cliente y
   están en `devDependencies`): en tu carpeta local sí están si hiciste `npm ci` sin
   `--omit=dev`. Para comparar `node_modules` igual a igual, usa `npm ci --omit=dev` en una
   segunda carpeta. La imagen tampoco lleva ya ningún `*.node`.

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
- 2026-11-09: `20261109T125531Z-arte-curioso-c42eff38` sobre
  `20261108T164136Z-menu-movil-9a93b482`. Promoción con resultado `ok` y contenedor sano.
  Antes, la build de esa misma tanda falló dos veces con «Segmentation fault», que entonces
  se achacó a una capa de la caché de Docker dañada en la tarjeta. Se reconstruyó una vez
  sin caché, y la release definitiva ya reutilizó la capa nueva de `npm ci`. Visto lo del
  día siguiente, lo más probable es que fuera la misma corrupción en memoria.
- 2026-11-10: `20261110T101102Z-pulido-artistico-13f7cc99` sobre
  `20261109T175828Z-estudio-pared-56c8426b`. La build falló tres veces: «Segmentation
  fault» con caché y, sin caché y al repetir, errores de `Intl` y un `SyntaxError` en
  `react-dom`. La Raspberry tenía en memoria una copia dañada del binario de Node de la
  imagen base (ver «Ficheros corruptos en la Raspberry»). Tras reiniciarla, la build salió
  a la primera sin caché (1287 pruebas dentro de la imagen), la imagen coincidió con una
  build limpia (1310 ficheros iguales, con las dos diferencias esperadas) y la promoción
  acabó con resultado `ok`.
- 2026-11-11, primer uso del proceso de `despliegue-ligero` (imagen construida en el
  equipo del operador): `20261111T071438Z-fase-4-6fd830cd`. Construcción, exportación,
  subida y carga en 63 s. La comprobación de contenido **no dejó marcar la release**: el
  binario de Node de la imagen base se leía en la Raspberry con `51400f37…` y del disco,
  directo, con `3e53e5ff…` (38.902 bytes distintos en doce páginas de 4 KiB seguidas). La
  caché de páginas había vuelto a dañarse 21 horas después del reinicio del día 10, con
  otra huella, y el contenedor de producción usaba ese mismo fichero. Con una avería que
  vuelve en un día, hay que mirar la tarjeta y la memoria de la Raspberry.
- Para verificar en la Raspberry, pregunta al contenedor, no al puerto 3001 del host (ese
  es de Uptime Kuma; ROCKY se publica en `127.0.0.1:3100`):
  `docker exec rocky035 bash scripts/healthcheck.sh && echo sano` (la misma sonda que usa
  Docker, sin arrancar otro Node), o `docker inspect -f '{{.State.Health.Status}}' rocky035`.
  La raíz pública enseña la puerta de acceso, así que el código nuevo se comprueba en
  `dist/assets` dentro del contenedor.
