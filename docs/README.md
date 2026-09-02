# Documentación

Índice de lo que hay en `docs/`. El README de la raíz explica cómo arrancar,
configurar Shopify y desplegar; `SECURITY.md` recoge los invariantes de
seguridad; `CLAUDE.md` y `CONTRIBUTING.md`, las convenciones de trabajo.

| Carpeta | Qué contiene |
| --- | --- |
| `design/` | QA visual de la portada (`design-qa.md`) y la previsualización del muñeco cotilla (`cotilla-esquina-preview.html`). |
| `images/` | Capturas que usa el README. |
| `marketing/` | Plan para sacar `posters/` y los binarios de `prompts-munecos/` a un repositorio aparte. |
| `ops/` | Operaciones delicadas que se ejecutan a mano y con acuerdo previo: `reescritura-historial.md` (purga de secretos y binarios del historial y rotación de credenciales). |
| `archive/2026-08/superpowers/` | Planes, especificaciones, revisiones y registros de despliegue de agosto de 2026. Es histórico: describe cómo se llegó al estado actual, no cómo funciona hoy. Los hostnames internos, el identificador del túnel y los ids de imagen Docker se han sustituido por marcadores (`<host-interno>`, `<id-tunel>`, `rocky035:<tag-imagen>`, `sha256:<digest>`). |

Regla de la casa: la documentación viva (README, SECURITY, CLAUDE,
CONTRIBUTING, `.env.example`) se mantiene con el código en el mismo commit;
lo que deja de estar vigente se archiva por fecha en `archive/` en lugar de
borrarse.
