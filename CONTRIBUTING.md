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
  `server/**` y `shared/**`) y `client` (jsdom, `src/**`).
- `npm run test:coverage` mide `server/` y `shared/` y falla por debajo del
  80 % de líneas. No forma parte de `check`; úsalo al tocar el servidor.
- Los tests HTTP levantan la app real con `createApp` y un `MemoryStore`;
  las llamadas a Shopify y OpenRouter se simulan con `fetchImpl`.

## Decisiones que conviene conocer

- **Extensiones `.mjs` sin `"type": "module"`.** Todo el código de Node
  (`server/`, `shared/`, `scripts/`, configs) usa `.mjs`, así que no hace
  falta declarar `"type": "module"`. Se valoró añadirlo y renombrar a `.js`:
  tocaría cada import, el Dockerfile, los globs de ESLint y la documentación
  sin ganar nada en tiempo de ejecución, y `public/theme-init.js` es un script
  de navegador clásico que no debe tratarse como módulo. Se queda como está.
- **Un solo proceso, un solo fichero cifrado.** `EncryptedFileStore` no
  soporta varias réplicas; antes de escalar hay que cambiar el adaptador.
- **`posters/` y `prompts-munecos/`** son material de marketing y saldrán del
  repo siguiendo `docs/marketing/README.md`. No añadas más binarios ahí.

## Lo que requiere acuerdo explícito

Reescribir el historial de Git, rotar credenciales, migrar a Express 5, borrar
`posters/` o `prompts-munecos/` y cualquier `git push --force`. Los
procedimientos están documentados en `docs/ops/` y `docs/marketing/` para
ejecutarlos de forma coordinada, nunca desde una rama compartida.
