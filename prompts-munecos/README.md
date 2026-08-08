# Muñecos ROCKY 035 — brief de generación de imágenes

Misión: generar los personajes dibujados de la marca ROCKY 035 con un modelo de
imagen (image gen), imitando **a la perfección** el estilo de los dibujos hechos a
mano que hay en `referencias/`. Los SVG provisionales que hay ahora en la web solo
marcan la posición; estas imágenes los sustituirán.

## Referencias de estilo (mirar SIEMPRE antes de generar)

| Archivo | Qué es |
| --- | --- |
| `referencias/tumbado.png` | Personaje tumbado apoyado en el codo (canon del estilo) |
| `referencias/sentados-banco.png` | Los tres sentados: chándal azul, sudadera negra ROCKY, chándal rojo |
| `referencias/camiseta-con-personajes.webp` | Print de camiseta con dos personajes |
| `referencias/icono-cara.png` | Cara de personaje usada como icono |
| `referencias/icono-robot.png` | Robot Rocky IA |
| `referencias/icono-carrito.png` | Carrito dibujado |
| `referencias/logo-rocky.png` | Wordmark ROCKY (la O es una diana/crosshair) |

## Canon del estilo (común a todos los prompts)

- Trazo de rotulador negro, **grosor uniforme**, línea segura y ligeramente
  imperfecta. Sin variación de grosor artística, sin bocetos sucios.
- **Rellenos planos**: blanco, negro, azul `#2F6FDB`, rojo `#E63946`. Nada más.
- **Sin** sombras, degradados, texturas, brillos ni volumen.
- Cabeza redonda **sobredimensionada** (~35–40 % de la altura total).
- Ojos = **gafas redondas con retícula de diana** (círculo + cruz fina dentro),
  como en todas las referencias. Sonrisa simple de una línea.
- Gorro de punto con costillas verticales o bucket hat.
- Ropa oversize (camiseta/chándal ancho), zapatillas chunky de skate.
- Detalle opcional en el pecho: mini diana roja o texto "ROCKY" pequeño.
- **Fondo 100 % transparente** (PNG con alfa). Sin suelo, sin sombra proyectada,
  sin atrezzo extra. Personaje aislado y completo, ocupando casi todo el encuadre.
- Sencillo, nada recargado: pocas líneas, como los originales.

## Flujo de trabajo

1. Leer un prompt de `01-*.md` … `24-*.md`:
   - 01–05: la primera tanda (grafitero, sentados, asomado, perdido).
   - 06–10: la segunda (skater, colgado, corriendo, dormido, perro).
   - 11–15: material gráfico (stickers, corona) y La Colmena (productor,
     rapero, abeja) — pendientes de generar.
   - 16–24: la TERCERA TANDA — cabezas nuevas (estrella, dado, nube, tele,
     lata de spray, media luna, diana, bombilla) y La Cruiser, la chica de la
     crew. Cada una con su anclaje anotado para el sistema de "apoyados";
     al generarlas, adjuntar también los cabezones geométricos ya hechos de
     `salidas/` como referencia de la familia.
2. Generar adjuntando como referencia visual las imágenes de `referencias/`
   (mínimo `tumbado.png` y `sentados-banco.png`).
3. Guardar el PNG transparente en `salidas/` con el nombre exacto que indica
   cada prompt (1024×1024 o superior).
4. Recortar los márgenes transparentes:
   ```bash
   python3 recortar_margenes.py salidas/*.png
   ```
   (imprescindible: el anclaje CSS de la web asume imagen sin aire alrededor).
5. Integración en la web (lo hará Claude/quien toque el código):
   - `salidas/grafitero-spray.png` → sustituye `<SprayGuy className="spray-guy"/>`
     en `src/components/ProductPage.jsx` por un `<img>` con la misma clase.
   - `salidas/sentado-borde-blanco.png` → sustituye `<SittingEdgeGuy variant="ink"
     className="detail-doodle"/>` en `src/components/ProductDetail.jsx`.
   - `salidas/sentado-borde-rojo.png` → sustituye `<SittingEdgeGuy variant="red"
     className="chat-doodle"/>` en `src/components/ChatComponent.jsx`.
   - Las clases CSS ya llevan el anclaje "apoyado sobre el borde". Para los
     sentados, ajustar el `transform: translateY(X%)` de `.detail-doodle` /
     `.chat-doodle` hasta que la línea del asiento (cadera) coincida con el
     borde: X = porcentaje de la altura de la imagen que queda POR DEBAJO de la
     cadera (las piernas que cuelgan).

## Reglas duras (negativos para todos los prompts)

Sin: 3D, render, acuarela, lápiz, sombreado, degradados, texturas, línea fina,
proporciones realistas, manos detalladas con dedos, fondo de ningún tipo, sombra
en el suelo, marcos, texto (salvo que el prompt lo pida), estilo anime/manga/Pixar.
