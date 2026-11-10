# Contribuir a ROCKY 035

## Antes de empezar

```bash
nvm use            # Node 24, según .nvmrc
cp .env.example .env
npm ci
npm run dev
```

La web queda en `http://localhost:3000` y el BFF en `http://localhost:3001`.
Sin credenciales de Shopify la tienda funciona en «Modo demo». Para el chat
hace falta `OPENROUTER_API_KEY`; para el carrito real, `SHOPIFY_STORE_DOMAIN`
y `APP_ENCRYPTION_KEY` (el README explica cómo generarla).

## Flujo de trabajo

1. Rama desde `main` con un nombre descriptivo.
2. Cambios pequeños y coherentes; cada commit deja `npm run check` en verde.
3. `npm run format` sobre lo que toques (Prettier decide el formato; ESLint y
   Stylelint no llevan reglas de estilo).
4. Si cambias comportamiento observable (códigos HTTP, forma del JSON,
   cabeceras, copy), añade o actualiza el test que lo cubre y anótalo en el
   cuerpo del commit.
5. Abre el pull request contra `main`. La CI repite `npm run check` y las dos
   auditorías de `npm audit`.

## Mensajes de commit

En español y en imperativo, con un título corto y un cuerpo que explique el
porqué (no el qué, que ya lo dice el diff):

```
Corrige el open redirect del retorno del login de Shopify

La ruta de retorno se resolvía como texto y `//evil.example` pasaba el
filtro. Ahora se resuelve contra PUBLIC_ORIGIN y sólo vale si sigue en él.
```

## Dónde va cada cosa

- `src/` es la SPA. Los estilos se organizan en capas
  (`styles/00-tokens.css` → base → utilidades → componentes → páginas) y
  todos los colores, tipografías y espaciados salen de los tokens.
- `server/` es el BFF, por capas: `config/` lee el entorno, `http/` habla
  HTTP, `services/` contiene la lógica, `integrations/` habla con Shopify y
  OpenRouter, `storage/` guarda estado y `lib/` son utilidades sin dominio.
  Una capa sólo importa de las capas inferiores.
- `shared/` son módulos sin dependencias de Node que importan tanto `src/`
  como `server/`.
- Los tests viven junto al módulo que prueban.

## Tests

- `npm run test:run` ejecuta los dos proyectos de Vitest: `server` (Node,
  `server/**`, `shared/**` y `scripts/**`) y `client` (jsdom, `src/**`).
- `npm run test:coverage` mide `server/` y `shared/` y falla por debajo del
  80 % de líneas. No forma parte de `check`; úsalo al tocar el servidor.
- Los tests HTTP levantan la app real con `createApp` y un `MemoryStore`;
  las llamadas a Shopify y OpenRouter se simulan con `fetchImpl`.

## Presupuesto de rendimiento

`npm run check` ejecuta `npm run budget:check` después del build: mide el
`dist/` recién construido (JavaScript y CSS iniciales en gzip, el mayor chunk
diferido, las fuentes precargadas y el tamaño y el peso de imágenes y audio)
y falla si algo supera los límites de `scripts/performance-budget.json`.

- Los límites sólo bajan. Si tu cambio deja una medida más de un 10 % por
  debajo de su límite, la comprobación pide bajarlo y dice a cuánto: hazlo en
  el mismo commit.
- Si te pasas, lo primero es recortar. Subir un límite o añadir una excepción
  se explica en el cuerpo del commit; una excepción nombra un fichero, su
  motivo y su propio techo, y se retira cuando deja de hacer falta.
- Un tipo de fichero nuevo en `dist/` (JPEG, AVIF, un vídeo…) hace fallar la
  comprobación hasta que `scripts/check-budget.mjs` tenga una regla para él.
- Un vídeo (`.mp4`, `.webm`, `.mov`) solo entra declarado en `videos` de
  `scripts/performance-budget.json`, con su fichero, su límite en kB y su
  motivo. Y en la página: con póster, `preload="none"`, la fuente asignada al
  entrar en pantalla, en pausa fuera de ella y con la pestaña oculta, y sin
  sonido automático.
- El cliente no lee `.env`: Vite tiene `envDir: false`, así que
  `npm run build` genera el mismo `dist/` de producción en cualquier equipo.
  No añadas variables `VITE_*`; el `.env` es del servidor.

## Decisiones que conviene conocer

- **Extensiones `.mjs` sin `"type": "module"`.** Todo el código de Node
  (`server/`, `shared/`, `scripts/`, configs) usa `.mjs`, así que no hace
  falta declarar `"type": "module"`. Se valoró añadirlo y renombrar a `.js`:
  tocaría cada import, el Dockerfile, los globs de ESLint y la documentación
  sin ganar nada en tiempo de ejecución, y `public/theme-init.js` es un script
  de navegador clásico que no debe tratarse como módulo. Se queda como está.
- **Un solo proceso, un solo fichero cifrado.** `EncryptedFileStore` no
  soporta varias réplicas; antes de escalar hay que cambiar el adaptador.
  Agrupa las escrituras en volcados: toda escritura es confirmada (espera a
  su volcado) salvo que se pida `{ durability: 'deferred' }`, que solo vale
  para lo que se puede volver a crear si el proceso muere. Ante la duda,
  confirmada.
- **`posters/` y `prompts-munecos/`** son material de marketing y saldrán del
  repo siguiendo `docs/marketing/README.md`. No añadas más binarios ahí.

## Lo que requiere acuerdo explícito

Reescribir el historial de Git, rotar credenciales, migrar a Express 5, borrar
`posters/` o `prompts-munecos/` y cualquier `git push --force`. Los
procedimientos están documentados en `docs/ops/` y `docs/marketing/` para
ejecutarlos de forma coordinada, nunca desde una rama compartida.
