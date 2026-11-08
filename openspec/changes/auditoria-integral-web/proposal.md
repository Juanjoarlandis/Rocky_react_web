# Propuesta: auditoría integral de la web (fase 1)

## Why

La web publicada (versión «El Tóxico», rescatada en `rescate/produccion-2026-09-29`)
creció durante septiembre en una rama que nunca llegó a GitHub y sin una revisión de
conjunto: hoy no hay un inventario de qué puede hacer un usuario, ni de qué arte se usa
o sobra, ni una medida de partida del rendimiento. Antes de corregir, rediseñar u
optimizar hace falta saber con exactitud qué hay y qué falla, para que las fases
siguientes tengan un alcance cerrado y verificable.

## What Changes

- Se levanta el **mapa completo de recorridos de usuario**: cada ruta de la SPA, cada
  feature de `src/features/` y cada endpoint de `server/http/routes/` queda asignado a
  uno o más recorridos con precondiciones, pasos, resultado esperado, datos que escribe y
  entorno que necesita, más una matriz de cobertura que demuestre que no falta ninguno.
- Se **ejecutan los recorridos** en navegador, en escritorio y en móvil, y se anota el
  resultado de cada uno con evidencia (OK, fallo o no ejecutado con su motivo).
- Se hace el **inventario y la revisión de dirección artística**: todo el arte de
  `src/images/`, `public/`, `posters/` y `prompts-munecos/` con su uso real, formato,
  medidas, peso y nombre, y un análisis de coherencia visual pantalla a pantalla frente
  a los tokens de `src/styles/00-tokens.css`.
- Se toman **métricas de partida reproducibles**: Lighthouse móvil y escritorio de las
  páginas principales, peso del bundle por chunk, peso de imágenes por página y
  `npm audit`, con fecha, commit y entorno.
- Se consolidan los **hallazgos** (funcionales, arte, rendimiento, accesibilidad, SEO,
  operación) con severidad, ubicación, reproducción y evidencia, y se agrupan en un
  **plan de fases 2–4** (errores funcionales, dirección artística, optimización) listo
  para convertir en cambios OpenSpec.
- Todo el resultado vive en `docs/auditoria/2026-11/`. **No se modifica código de la
  aplicación, ni configuración, ni dependencias, ni producción.**

## Capabilities

### New Capabilities

Ninguna. La auditoría no cambia el comportamiento del sistema: el cambio declara
`skip_specs: true`. Las especificaciones de comportamiento llegarán con los cambios de
las fases 2–4, ya contrastadas con lo que la auditoría observe (ver `design.md`, D1).

### Modified Capabilities

Ninguna.

## Fuera de alcance

- Corregir errores, cambiar estilos, mover o borrar arte, optimizar: se registran como
  hallazgos y se resuelven en las fases 2–4, cada una con su propio cambio.
- Auditoría de seguridad formal (se hará con `security-review` en los cambios que
  toquen login, sesiones, carrito o checkout). Lo que se observe de pasada se anota como
  hallazgo.
- Pagos reales, pedidos o cualquier escritura en la tienda o la web de producción.
- Desplegar, tocar la Raspberry o cambiar la puerta de acceso de producción.

## Supuestos

- **Entorno de pruebas**: los recorridos que necesitan Shopify (carrito, checkout,
  cuenta de cliente, Crew) u OpenRouter (Rocky IA) solo se ejecutan si el usuario
  rellena un `.env` local con credenciales de la tienda de desarrollo
  (`rocky-dev.myshopify.com`) y una clave de OpenRouter de modelos `:free`. Sin eso
  quedan como «no ejecutado: falta entorno» y la auditoría lo declara.
- **Producción**: está tras la puerta privada. Solo se recorre si el usuario la abre él
  mismo en el navegador integrado, y únicamente con recorridos que no escriben nada.
- **Customer Account** exige `PUBLIC_ORIGIN` HTTPS; si no hay forma de probarlo en
  local, se revisa por código y en producción con la sesión del usuario.
- `docs/archive/2026-08/superpowers/` es histórico y no se usa como plan.

## Impact

- Archivos nuevos: `docs/auditoria/2026-11/` (documentos Markdown, un número reducido de
  capturas optimizadas y los scripts de la auditoría en `herramientas/`) y este cambio en
  `openspec/`. La inicialización de OpenSpec (`openspec/config.yaml` y las skills
  `.claude/skills/openspec-*`) va en un commit propio, previo a este cambio.
- Sin cambios en `src/`, `server/`, `shared/`, `public/`, `scripts/`, `package.json` ni
  en la configuración. `npm run check` debe seguir en verde.
- Herramientas externas sin añadirlas al proyecto: Lighthouse con versión fijada vía
  `npx` y Google Chrome ya instalado.
- Salida: lista priorizada de hallazgos y plan de fases que el usuario aprueba antes de
  abrir los cambios de las fases 2–4.
