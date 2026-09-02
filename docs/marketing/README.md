# Material de marketing: plan para sacarlo del repositorio

## Qué hay y por qué estorba

| Carpeta | Tamaño | Contenido | Se usa en la web |
| --- | --- | --- | --- |
| `posters/` | ~47 MB | Pósters para Instagram a 2160×2700, miniaturas, dos vídeos MP4 y una galería HTML. | No. |
| `prompts-munecos/` | ~5 MB | Briefs de generación de los muñecos (Markdown), referencias de estilo, salidas PNG, favicons en varios tamaños y un script Python de recorte. | Sólo los PNG de `salidas/` sirvieron de origen para `src/images/optimized/**`; la web no los lee. |

Ninguno de los dos entra en la imagen Docker (`.dockerignore`) ni en el
bundle, pero cada clon y cada `git fetch` arrastran ~52 MB de binarios, el
historial ya guarda versiones antiguas de los mismos ficheros y Prettier,
ESLint y el escaneo de secretos tienen que saltárselos a propósito. Son
material de marketing, con su propio ritmo de cambio y sus propios
responsables: merecen un repositorio aparte.

## Plan

1. **Crear el repositorio de marketing** (por ejemplo `rocky035-marketing`),
   privado, con un README que explique el formato de los pósters (hoy está en
   `posters/README.md`) y el canon de los muñecos (`prompts-munecos/README.md`).
2. **Mover los ficheros** con `scripts/marketing/extraer-posters.sh
   <ruta-del-repo-de-marketing>`. Sin `--apply` sólo enseña la lista; con
   `--apply` copia `posters/` entero y los binarios de `prompts-munecos/`
   (PNG, WebP, JPG, ICO, vídeo), los quita del índice de este repo y deja los
   cambios sin commitear en los dos repositorios para revisarlos.
   Los briefs `.md` y `recortar_margenes.py` se quedan aquí porque
   documentan de dónde salen los personajes de la web.
3. **Commit en ambos repos** y añadir a `.gitignore` de este repositorio
   `/posters`, `/prompts-munecos/salidas`, `/prompts-munecos/referencias` y
   `/prompts-munecos/favicons`, para que nadie los vuelva a subir por
   accidente.
4. **Enlazar** desde `prompts-munecos/README.md` al repositorio de marketing
   y actualizar la sección «Estructura del repo» del README.
5. **Purgar el historial** siguiendo `docs/ops/reescritura-historial.md`:
   sin ese paso el tamaño del clon no baja, porque los blobs siguen en los
   commits antiguos. Es el único paso irreversible y se hace coordinado.

## Qué no cambia

- `src/images/optimized/**` (los WebP que sí usa la web) se queda y se
  regenera con `npm run images:optimize` desde una carpeta maestra local
  (`assets-master/`, ignorada por git) o desde el repositorio de marketing.
- `public/products/*.webp`, `public/street/*` y `docs/images/*` siguen aquí:
  son parte del producto o del README.

## Estado

Preparado, no ejecutado. El script y este plan están listos; mover los
ficheros y reescribir el historial requiere acuerdo previo.
