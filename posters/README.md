# Pósters ROCKY 035

Piezas gráficas para Instagram. Cada una enseña una zona real de la web dentro de un
navegador dibujado a mano, rodeada de los muñecos de la casa.

**Para verlos todos de golpe, abre [`index.html`](index.html) en el navegador.**

```bash
open posters/index.html
```

## Qué hay aquí

| carpeta | qué contiene |
|---|---|
| `index.html` | galería con las piezas y los vídeos. Empieza por aquí. |
| `img/` | los pósters a **2160×2700** (el doble de Instagram). Listos para subir. |
| `miniaturas/` | versiones ligeras que usa la galería. |
| `video/` | los dos vídeos en MP4 1080×1350. |

## Formato

- **Estáticos**: 2160×2700 px, proporción 4:5 (la que más ocupa en el feed).
  Instagram los reescala a 1080×1350 al subirlos; darle el doble de resolución
  hace que su recompresión parta de más información y quede más limpio.
- **Vídeos**: MP4 H.264, 1080×1350, 30 fps, CRF 16. Renderizados fotograma a
  fotograma a doble resolución, no capturados en tiempo real.

## Reglas de la casa

- La dirección del navegador va **censurada** (`shhh…`) en todas las piezas: el
  proyecto sigue sin anunciarse. Sólo se ve la ruta (`/crew`, `/cart`…).
- Handle: **@rocky.tres.cinco**.
- Tipografías: **Luckiest Guy** (titulares) + **Fredoka** (texto), las mismas que la web.
- Paleta: tinta `#1a1a1a`, papel `#faf7f0`, rojo `#e63946`, azul `#2f6fdb`, dorado `#f4b942`.

## Cómo se regeneran

Los fuentes son HTML sueltos, uno por póster, en el scratchpad de la sesión de Claude Code.
Cada uno se renderiza con Playwright a 3× y pasa por un auditor que detecta textos
desbordados, solapados u ocultos tras un muñeco antes de dar la pieza por buena.
