# Propuesta: despliegue ligero

## Why

Hoy la imagen de cada release se construye **en la propia máquina de producción**:
`release:preparar` sube el código a la Raspberry y allí se ejecutan `npm ci`, las pruebas
y `vite build` (`scripts/release/preparar.mjs`, `Dockerfile`). Es lo más pesado
que hace esa máquina, y es donde falla:

- El 9 y el 10 de noviembre de 2026 el build reventó cinco veces por copias dañadas de
  ficheros en la memoria de la Raspberry; hubo que reiniciarla para poder publicar
  (`docs/ops/publicar.md`, «Ficheros corruptos en la Raspberry»). Una build que termina
  bien también puede llevar un fichero dañado, y hoy eso se comprueba a mano.
- Una máquina pequeña no debería necesitar la CPU, la memoria ni el disco de un build
  para poder servir la web.
- La imagen de runtime lleva 16,2 MB de `node_modules`, de los que 11,3 MB son React y
  su router, que el servidor no importa (`linea-base-fase-4.md`, 4.1).
- El contenedor de producción no tiene límite de memoria: si el servidor se desboca, se
  lleva por delante a los demás servicios de la máquina.

Es de **nivel 3**: cambia el proceso de publicación de producción.

## What Changes

- **La imagen se construye en el equipo del operador**, para la arquitectura de
  producción (ARM64) y sin emulación: las dependencias, las pruebas y el build corren en
  la plataforma del equipo que publica, y la etapa de runtime solo copia ficheros.
  Comprobado el 2026-11-10: sale una imagen ARM64 con el mismo `dist/` y sin binarios
  nativos.
- **La imagen viaja ya hecha**: se exporta, se sube con su huella, se verifica y se
  carga en la Raspberry. Allí ya no se instalan dependencias ni se ejecutan pruebas ni
  builds.
- **Verificación automática de lo que hoy se compara a mano**: tras cargarla, se
  comprueba en la Raspberry que la arquitectura es la suya y que las huellas de los
  ficheros de la aplicación dentro de la imagen son las calculadas al construirla. Sin
  esa verificación, la release no se puede promover.
- **Construir en la Raspberry queda como último recurso**, con una opción explícita.
- **React, React DOM y React Router pasan a `devDependencies`**: son del build del
  cliente. La imagen de runtime deja de llevarlos.
- **Límite de memoria en `compose.production.yaml`**, sin swap y ajustable desde el
  fichero de entorno de la release.
- **Documento de caché de borde** (`docs/ops/`) con las reglas de Cloudflare que
  convienen al abrir la puerta y las órdenes para comprobarlas. No se aplica nada.

## Capabilities

### New Capabilities

- `publicacion-de-releases`: dónde se construye la imagen de una release, cómo llega a
  producción y qué se comprueba antes de poder promoverla. Es la capacidad que definió
  el cambio `proceso-de-publicacion`, aún sin archivar; este cambio le añade requisitos
  y no modifica ninguno de los suyos.
- `imagen-de-produccion`: qué contiene la imagen de runtime y con qué límites corre el
  contenedor.

### Modified Capabilities

Ninguna (`openspec/specs/` está vacío).

## Fuera de alcance

- Un registro de imágenes, construir en CI o desplegar desde GitHub: el diseño de
  `proceso-de-publicacion` ya lo descartó y sigue valiendo.
- Cambiar la imagen base, la promoción o la vuelta atrás.
- Aplicar reglas en Cloudflare, tocar la Raspberry o publicar: necesitan autorización
  expresa.
- El tope de heap de Node y la sonda de salud: `servidor-ligero`.

## Supuestos

- El equipo desde el que se publica tiene Docker con `buildx` (ya lo exige hoy tener
  Docker para probar la imagen) y no necesita QEMU.
- El servidor seguirá sin dependencias nativas en producción (hoy `express` y `dotenv`).
  Si entra una, la construcción sin emulación deja de valer y la comprobación lo dice.
- El límite de memoria se fija después de que `servidor-ligero` deje medido el pico
  bajo carga.

## Impact

`Dockerfile`, `compose.production.yaml`, `package.json` y `package-lock.json`,
`scripts/release/` (preparar, promover, plantilla y sus pruebas),
`.github/dependabot.yml`, `docs/ops/publicar.md`, un documento nuevo de caché de borde y
`SECURITY.md`. Sin cambios en `src/` ni `server/`. Sin dependencias nuevas.
