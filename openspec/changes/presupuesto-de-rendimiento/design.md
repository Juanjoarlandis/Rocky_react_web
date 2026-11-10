# Diseño: presupuesto de rendimiento

## Context

Ver `proposal.md` para el motivo. Lo que condiciona el diseño:

- `npm run check` es `test:run && lint && lint:css && build && security:check`, y el CI
  solo ejecuta `npm run check` y `npm audit`. `scripts/check-secrets.mjs` es el precedente:
  un script de Node sin dependencias que recorre el árbol y `dist/` y termina con código 1.
- Vitest ya recoge `scripts/**/*.test.mjs` en el proyecto `server` (Node).
- `src/` y `shared/` no leen `import.meta.env` ni `process.env`: el build del cliente no
  necesita ninguna variable.
- Comprobado el 2026-11-10 sobre un `git archive` de `7effff4` con Vite 8.3.6:
  con un `.env` que contiene `NODE_ENV=development`, `vite build` genera un `index` de
  534,4 kB con `jsxDEV`; con `envDir: false` en `vite.config.mjs` genera 323,0 kB y los 127
  ficheros de `dist/` coinciden por `sha256sum` con el build sin `.env`.
- Medidas de partida con el método de este cambio (gzip de `node:zlib`, nivel 9, sobre el
  `dist/` de `7effff4`): JavaScript inicial 121,86 kB; CSS inicial 18,52 kB; mayor chunk
  diferido 20,36 kB (`Studio`); fuentes precargadas 81,8 kB; 90 imágenes, 5.121,0 kB; audio
  3.701,3 kB. Difieren un 1 % de las cifras que imprime Vite (123,2 y 18,7 kB), que son
  las que cita la línea base.

## Goals / Non-Goals

**Goals:**

- Que una regresión de peso rompa `npm run check` en local y en el CI, con un mensaje
  que diga qué métrica, cuánto y contra qué límite.
- Que el build que se mide sea siempre el de producción.
- Que los cambios siguientes de la fase 4 solo tengan que editar un fichero de límites.

**Non-Goals:**

- Medir tiempos (LCP, CLS), memoria o CPU: dependen del equipo y tardan minutos.
- Un presupuesto por ruta: basta con el común y el mayor chunk diferido.
- Analizar el contenido del bundle; para eso está
  `docs/auditoria/2026-11/herramientas/fase4/composicion-chunk.mjs.txt`.

## Decisions

### D1. Vite no lee `.env`: `envDir: false`

`vite.config.mjs` desactiva la carga de ficheros de entorno.

- *Por qué*: ataca la causa. El cliente no usa variables, y además Vite deja de abrir un
  fichero que contiene los secretos del servidor.
- *Alternativa descartada*: `NODE_ENV=production vite build` en el script de npm. Arregla
  el build, pero no `npx vite build` ni el servidor de desarrollo, y Vite seguiría
  leyendo el `.env`.
- *Alternativa descartada*: dejarlo y que solo avise la comprobación. Seguiría habiendo
  un `npm run build` + `npm start` local que sirve React de desarrollo.
- La comprobación conserva además una guarda (D6) por si `NODE_ENV=development` llega
  exportado en la shell.

### D2. Se mide lo que declara `dist/index.html`

El JavaScript inicial es el `<script type="module">` de entrada más cada
`<link rel="modulepreload">`; el CSS inicial, cada `<link rel="stylesheet">`. Todo JS de
`dist/assets/` que no esté en esa lista es diferido.

- *Por qué*: es exactamente lo que el navegador descarga antes de pintar, y sigue siendo
  correcto cuando el reparto en chunks cambie (hoy hay un chunk compartido con
  `react-router` que va precargado).
- *Alternativa descartada*: nombres fijos (`index-*.js`). Deja fuera los chunks
  compartidos, que hoy ya suman 47 kB.
- La compresión es gzip de `node:zlib` a nivel 9, determinista y sin dependencias. No se
  usa Brotli: el origen aún no lo sirve (`servidor-ligero`) y gzip es la referencia de la
  línea base.

### D3. Los límites en `scripts/performance-budget.json`

Un JSON con una entrada por métrica (`limit`, `target` y una nota) y una lista de
excepciones (`file`, `reason`, `limit`). El script lo lee; no hay límites en el código.

- *Por qué*: los demás cambios solo tocan datos, y el diff de un límite se revisa solo.
- *Alternativa descartada*: límites dentro del `.mjs`. Mezcla política y mecanismo.
- Valores iniciales (límite / objetivo): JavaScript inicial 123 / 100 kB; CSS inicial
  19 / 15 kB; chunk diferido 21 / 21 kB; fuentes precargadas 82 / 82 kB; lado de imagen
  1.600 / 1.600 px; peso de imagen 200 / 200 kB; total de imágenes 5.200 / 5.200 kB; pista
  de audio 1.100 / 1.100 kB; total de audio 3.750 / 3.750 kB.
- Donde la línea base no fija objetivo (imágenes, audio, fuentes), el objetivo inicial
  es «no empeorar» (igual al límite). `imagenes-y-medios` y `carga-y-estabilidad` bajarán
  esos objetivos en sus propios deltas.
- Excepciones iniciales: `products/rocky35-camel.webp` y `products/rockydz-boyz.webp`
  (lado 5.906 px, H-003); `toxico-paseo-224` (710 kB) y `lata-spray-walk-seedance-224`
  (665 kB, H-169); `music/barro.m4a` (2.700 kB, H-145). Los ficheros con hash se nombran
  sin él.

### D4. Trinquete con un 10 % de margen

Si una medida queda por debajo del 90 % de su límite y el límite está por encima de su
objetivo, la comprobación falla y propone el límite nuevo: la medida redondeada hacia
arriba, sin bajar del objetivo.

- *Por qué*: sin esto, una mejora de 20 kB deja 20 kB de hueco para la siguiente
  regresión. Con un 10 %, el ruido normal entre commits no molesta.
- *Alternativa descartada*: solo avisar. Los avisos de `npm run check` no los lee nadie.

### D5. Dimensiones de imagen leyendo la cabecera

El script lee los primeros bytes de cada WebP (VP8, VP8L y VP8X, con su bandera de
animación) y PNG. Cualquier otra extensión de imagen en `dist/` es un error.

- *Por qué*: no añade dependencias. `sharp` no es dependencia del proyecto a propósito
  (arrastra binarios nativos al build) y hoy `dist/` solo lleva WebP, PNG, un SVG y un ICO.
- SVG e ICO se excluyen por extensión; JPEG, AVIF o GIF fallan hasta que alguien añada
  su lector, que es la señal de que ha entrado un formato nuevo.

### D6. Orden y guardas

`check` pasa a ser `test:run && lint && lint:css && build && budget:check && security:check`.
El script comprueba primero que existe `dist/index.html` y que el script de entrada no
lleva `jsxDEV`; si falla cualquiera de las dos, lo dice y no mide.

- *Por qué*: medir un build de desarrollo daría un falso «te has pasado» de 200 kB.

## Risks / Trade-offs

- [El trinquete obliga a tocar el fichero de límites en los commits que mejoran] → Es lo
  que se busca; el mensaje da el número exacto que hay que escribir.
- [Las cifras de gzip no coinciden al kB con las de Vite] → El diseño fija el método; la
  línea base se cita solo como referencia y los objetivos (100 y 15 kB) tienen margen.
- [`envDir: false` rompe a quien añada un `VITE_*` en `.env`] → Queda escrito en
  `CLAUDE.md` junto a la regla de que no hay secretos `VITE_*`.
- [Un formato de imagen nuevo rompe `check`] → A propósito; añadir el lector es una
  función pequeña con su prueba.

## Migration Plan

No hay datos ni despliegue. Se integra en un commit; si diera falsos positivos, se
retira `budget:check` de `check` con un revert, sin tocar la web.
