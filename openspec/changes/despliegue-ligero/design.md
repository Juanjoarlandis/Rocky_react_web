# Diseño: despliegue ligero

## Context

Ver `proposal.md` para el motivo. Lo que condiciona el diseño (leído y probado el
2026-11-10):

- **Proceso actual** (`scripts/release/`): `preparar` exige árbol limpio y commit en
  `origin`, empaqueta con `git archive` lo que no excluye `.dockerignore`, calcula
  `SHA256SUMS` y `release.json`, sube la carpeta por `rsync`, la verifica con
  `sha256sum -c` y ejecuta **`docker build -t rocky035:<id>` en la Raspberry**.
  `promover` comprueba con `docker image inspect` que la imagen existe y lanza un script
  que arranca con `docker compose up --wait` y vuelve atrás solo. Todo es simulacro sin
  `--aplicar`. Las pruebas usan un `remote` y un `docker` de mentira.
- **Decisiones vigentes** (`openspec/changes/proceso-de-publicacion/design.md`): se
  descartó construir en CI con registro porque añade un registro, compilación cruzada y
  otro sitio con credenciales; desplegar desde GitHub es un no-objetivo.
- **Producción** es ARM64 (Raspberry, Debian). Su caché de páginas ha servido copias
  dañadas de ficheros dos días seguidos, y `docs/ops/publicar.md` describe una
  comparación manual de la imagen con una build limpia antes de promover.
- **`Dockerfile`**: dos etapas sobre `node:24.19.0-bookworm-slim` fijada por digest. La
  de build hace `npm ci`, `npm run test:run && npm run build` y `npm prune --omit=dev`;
  la de runtime solo tiene `COPY`, `ENV`, `WORKDIR`, `USER`, `EXPOSE`, `HEALTHCHECK` y
  `CMD`.
- **Prueba de construcción cruzada** en un equipo x86-64 sin QEMU (0 entradas en
  `binfmt_misc`), con `FROM --platform=$BUILDPLATFORM` en la etapa de build y
  `docker buildx build --platform linux/arm64 --load`: termina bien, la imagen declara
  `arm64`, sus 127 ficheros de `dist/` coinciden por `sha256` con el build limpio y el
  `node_modules` de runtime no tiene ningún `.node`. `docker save` ocupa 277,6 MB
  (100,1 MB con `gzip -1`). Con el driver `docker`, `--output type=docker,dest=…` no está
  soportado: hay que cargar y luego `docker save`.
- **Dependencias**: de 74 paquetes de producción, 5 son `react`, `react-dom`,
  `scheduler`, `react-router` y `cookie-es`. Nada en `server/`, `shared/` ni en los
  scripts que copia el `Dockerfile` los importa. `npm audit --omit=dev` del CI los audita
  hoy como producción.
- **Compose**: `image: ${ROCKY_IMAGE:-rocky035:local}`, sin límites. El selector
  `compose.env` de cada release ya lleva `ROCKY_IMAGE` y `COMPOSE_PROJECT_NAME`.

## Goals / Non-Goals

**Goals:**

- Que la Raspberry no ejecute `npm ci`, pruebas ni builds para publicar.
- Que una imagen dañada o de otra arquitectura no se pueda promover.
- No añadir registro, credenciales ni emulación.
- Que el contenedor no pueda llevarse la memoria de la máquina.

**Non-Goals:**

- Automatizar la publicación.
- Reducir la imagen base: se guarda una vez y la comparten todas las releases.

## Decisions

### D1. Construir en el equipo del operador, sin emulación

La etapa de build del `Dockerfile` pasa a `FROM --platform=$BUILDPLATFORM …`. `preparar`
construye desde la carpeta del `git archive` (no desde el árbol de trabajo) con
`docker buildx build --platform linux/<arquitectura> --load`, donde la arquitectura sale
de `uname -m` en la máquina de producción.

- *Por qué*: las dependencias de producción son JavaScript puro, así que lo que produce
  la etapa de build vale para cualquier arquitectura, y la etapa final no ejecuta nada.
  No hace falta QEMU, ni registro, ni CI: se sostienen los motivos por los que
  `proceso-de-publicacion` descartó construir fuera.
- *Alternativa descartada: emulación con QEMU.* `npm ci` y 1.300 pruebas emuladas son
  lentos y exigen instalar `binfmt` en el equipo del operador.
- *Alternativa descartada: CI y registro.* Ya descartada; nada ha cambiado.
- *Alternativa descartada: seguir en la Raspberry.* Es el problema.
- Dos guardas mantienen cierta la premisa: una prueba que falla si hay un `RUN` tras el
  último `FROM`, y otra que falla si el árbol de producción de `package-lock.json`
  incluye paquetes con binarios nativos.

### D2. La imagen viaja como fichero con huella

Tras construir: `docker save | gzip` a un fichero dentro de la carpeta temporal de la
release, con su `sha256` en un fichero aparte. Se sube con el `rsync` de siempre; en la
Raspberry, `sha256sum -c`, `docker load` y borrado del fichero.

- *Por qué*: reutiliza el transporte y la verificación que ya existen. Son unos 100 MB
  por release.
- *Alternativa descartada: un registro en la Raspberry.* Otro servicio que mantener en
  la máquina que se quiere aligerar.
- *Alternativa descartada: conservar el fichero para que `rsync` envíe solo
  diferencias.* Ahorra red a cambio de 280 MB de tarjeta por release.
- El paquete de código se sigue subiendo entero: lo usan Compose, la comparación
  documentada y el camino de respaldo. `release.json` no cambia.

### D3. Verificar el contenido en producción y bloquear la promoción

Al construir, `preparar` saca los ficheros de la aplicación de la imagen sin ejecutarla
(`docker create` y `docker cp` de `/app`) y calcula sus huellas. Tras `docker load`, en
la Raspberry se comparan con las de la imagen cargada (la orden que hoy documenta
`publicar.md`) y con `{{.Architecture}}` frente a `uname -m`. Si todo coincide, se
escribe una marca de verificación en la carpeta de la release. `promover` y el script
de promoción exigen esa marca como precondición.

- *Por qué*: automatiza la comparación manual y detecta justo el fallo que se ha visto:
  ficheros que en la Raspberry se leen distintos de como se escribieron.
- La marca vive en la carpeta de la release, no en `release.json`, para no cambiar el
  requisito de sus siete campos.
- *Ampliado tras la revisión independiente*: además de `/app` se compara la huella de
  `/usr/local/bin/node`. No es de la aplicación, pero es lo que la ejecuta y es
  exactamente el fichero que la Raspberry leyó dañado el 10 de noviembre; `docker load`
  reutiliza la capa base que ya está allí, así que sin esto una copia dañada pasaría.
  El resto de la imagen base no se compara.
- Tras arrancar, el script de promoción comprueba que el contenedor corre la imagen de
  la marca (Compose arranca por etiqueta) y vuelve atrás si no.
- *Corregido al implementar*: «la misma imagen» no se puede comprobar por su
  identificador. El Docker del operador (almacén clásico) y el de la Raspberry (almacén
  de containerd) dan identificadores distintos a la misma imagen. Se compara una huella
  que no depende del almacén: las capas (todo el sistema de ficheros) y el arranque
  (entrada, orden, entorno, usuario, carpeta y sonda). La marca guarda el identificador
  que la imagen tiene en producción, y el script de promoción exige que la etiqueta siga
  apuntando a él.
- Las releases anteriores a este cambio no tienen marca: `revertir` no la exige.

### D4. Camino de respaldo explícito

`preparar` acepta una opción para construir en la Raspberry como hoy. Avisa en la
salida, y después ejecuta la misma verificación de D3 contra una build local.

- *Por qué*: si un día la imagen construida en el equipo del operador no se puede enviar
  o cargar, publicar no queda bloqueado; y el código ya existe y está probado.
- *Limitación*: el equipo del operador tiene que poder construir igualmente, porque de su
  build salen las huellas con las que se compara. Si no puede construir en absoluto, no
  hay verificación y por tanto no hay release promovible: no se añade un tercer camino
  sin verificar.
- Para que las dos builds den las mismas huellas, la imagen ya no lleva la caché de las
  pruebas (`node_modules/.vite`), que cambia en cada build.

### D5. React a `devDependencies`

`react`, `react-dom` y `react-router` pasan a `devDependencies`. `npm prune --omit=dev`
los quita solo de la imagen de runtime.

- *Por qué*: son del build del cliente. El `node_modules` de runtime baja de 16,2 MB a
  unos 5 MB.
- *Consecuencia*: `npm audit --omit=dev` deja de cubrirlos; el `npm audit` completo del
  CI los sigue auditando. Se añaden a un grupo de Dependabot y se actualiza la
  comparación de `publicar.md`.
- *Alternativa descartada: un segundo `package.json` para el servidor.* Dos árboles de
  dependencias para ahorrar lo mismo.

### D6. Límite de memoria en Compose, ajustable

`compose.production.yaml` declara `mem_limit` y `memswap_limit` con
`${ROCKY_MEM_LIMIT:-192m}`. Sin límite de CPU.

- *Por qué 192 MB*: es casi el doble del pico que `servidor-ligero` exige (100 MB) y
  deja margen para un estado grande. Sin swap, para no machacar la tarjeta.
- *Por qué ajustable*: el selector `compose.env` de la release puede subirlo sin
  reconstruir ni tocar el fichero de Compose.
- *Por qué sin límite de CPU*: la máquina tiene núcleos libres y una cuota solo añade
  latencia (los p95 de 50 ms de la línea base son la cuota, no el disco).
- No se activa hasta que `servidor-ligero` esté publicado: con el servidor de hoy, 192 MB
  no bastan bajo carga.

### D7. La imagen base no cambia

Se mantiene `node:24.19.0-bookworm-slim`.

- *Alternativa descartada: Alpine o distroless.* La base se guarda una vez y la
  comparten las releases; cada release añade solo unos 24 MB. A cambio habría que
  rehacer la sonda y los procedimientos que usan `sh`, `find` y `sha256sum`, y validar
  `musl`.

### D8. Caché de borde: solo documento

`docs/ops/cloudflare.md` recoge qué cachea Cloudflare con las cabeceras que ya manda el
servidor, qué reglas harían falta (por ejemplo, para `/music/*.m4a` si su extensión no
entra en la caché por defecto) y cómo comprobarlo con `curl` y `cf-cache-status`. No se
toca Cloudflare.

## Risks / Trade-offs

- [El límite de memoria también cuenta para los scripts lanzados con `docker exec`] →
  Medido en `servidor-ligero`: exportar o enviar avisos dentro del contenedor arranca
  otro Node en el mismo cgroup y, con 128 MB y un almacén grande, lo mata. El límite se
  elige contando con ese segundo proceso (por eso 192 MB y no 128) y se verifica con un
  `docker exec … exportar-avisos.mjs` sobre un almacén de 5.000 sesiones.

- [El equipo del operador pasa a ser parte de la cadena de construcción] → Se construye
  desde el `git archive` de un commit que está en `origin`, con la imagen base fijada
  por digest y las pruebas dentro del build; las huellas del contenido quedan
  registradas en la release.
- [El Docker del operador no puede descargar la imagen base (por ejemplo, un ayudante de
  credenciales roto)] → Se documenta en «Si algo falla» con la solución de
  `DOCKER_CONFIG`; el simulacro comprueba que `buildx` está disponible.
- [La arquitectura se detecta mal] → D3 la comprueba otra vez con la imagen ya cargada.
- [Entra una dependencia nativa en producción] → Falla la guarda de D1; habría que
  instalarla para la arquitectura de destino en una etapa propia.
- [El límite de memoria mata el contenedor en un pico] → Valor con margen, ajustable
  desde el entorno; `restart: unless-stopped` lo levanta; se activa después de
  `servidor-ligero`.
- [Más pasos en la preparación] → Todos automáticos y en simulacro por defecto.

## Migration Plan

1. Implementar y probar en local con el `docker` y el `remote` de mentira, y con Docker
   real para la construcción cruzada.
2. **Con autorización expresa**: simulacro contra la Raspberry (solo lectura).
3. **Con autorización expresa**: preparar una release con el camino nuevo y, sin
   promoverla, compararla con una imagen del mismo commit construida en la Raspberry.
4. **Con autorización expresa**: promover. La vuelta atrás es `release:revertir`, que no
   cambia.
5. El límite de memoria entra en una release posterior a `servidor-ligero`. Para
   quitarlo sin release: `ROCKY_MEM_LIMIT` en el selector y recrear el contenedor.

Al ser nivel 3: revisión de seguridad (`security-review`) del proceso antes del paso 2.
