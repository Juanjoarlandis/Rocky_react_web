# Reescritura del historial y rotación de credenciales

**Sólo documentación. Nada de esto se ha ejecutado.** Reescribir el historial
es irreversible para quien no tenga una copia, invalida todos los clones y
requiere `git push --force`. Se hace una sola vez, con acuerdo previo, con
todos los cambios en curso integrados y con los despliegues avisados.

## Qué hay que sacar del historial

| Qué | Por qué |
| --- | --- |
| `.env` y `.env.enc` | Ficheros de entorno con credenciales, presentes en commits antiguos aunque ya no estén en el árbol. |
| `src/images/optimized/characters/lata-spray-walk-seedance.webm` (15 MB) | Vídeo generado, sustituido por WebP de 224 px; sigue en el historial. |
| `src/images/optimized/characters/lata-spray-walk-seedance-alpha.png` (7 MB) | Fotograma maestro del anterior; sigue en el historial. |
| `posters/` | Material de marketing (~47 MB) que se mueve a otro repositorio (`docs/marketing/README.md`). Purgar sólo después de moverlo. |
| Los commits «aaa» de 2023 | Historial del sitio estático original sin mensajes útiles; se aplastan en un único commit. |
| `refs/codex/*` | Snapshots y checkpoints de una herramienta; no son ramas de trabajo. |

Comprueba la lista antes de empezar (los tamaños están en bytes):

```bash
git rev-list --all --objects \
  | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
  | awk '$1=="blob" && $3 > 1000000' | sort -k3 -n -r
git log --all --diff-filter=A --name-only --format='' -- '.env' '.env.enc' | sort -u
git log --all --format='%h %ad %s' --date=short | grep -c ' aaa$'
git for-each-ref --format='%(refname)' refs/codex
```

## 0. Requisitos

- [git-filter-repo](https://github.com/newren/git-filter-repo) instalado
  (`brew install git-filter-repo` o `pipx install git-filter-repo`).
- Todas las ramas de trabajo integradas o guardadas en otro sitio. Los
  worktrees de `.claude/worktrees/` deben cerrarse antes.
- Una copia de seguridad completa:

```bash
git clone --mirror git@github.com:<org>/<repo>.git ../rocky035-web-backup.git
```

- Trabajar sobre un clon fresco (filter-repo lo exige):

```bash
git clone git@github.com:<org>/<repo>.git ../rocky035-web-rewrite
cd ../rocky035-web-rewrite
```

## 1. Purgar ficheros y carpetas

```bash
git filter-repo --invert-paths \
  --path .env \
  --path .env.enc \
  --path src/images/optimized/characters/lata-spray-walk-seedance.webm \
  --path src/images/optimized/characters/lata-spray-walk-seedance-alpha.png \
  --path posters/
```

Si en el momento de ejecutarlo `posters/` todavía no se ha movido al
repositorio de marketing, quita esa línea y repite la purga más adelante.

## 2. Aplastar los commits «aaa» de 2023

Los commits «aaa» son los primeros del historial (noviembre de 2023). Se
sustituyen por un único commit de importación:

```bash
# Último commit «aaa» del historial lineal de main
LAST_AAA=$(git log --format='%H %s' main | awk '$2=="aaa"{print $1; exit}')
# Primer commit del repositorio
ROOT=$(git rev-list --max-parents=0 main)

git checkout -b importacion-2023 "$LAST_AAA"
git reset --soft "$ROOT"
git commit --amend -m "Importa el sitio estático original de ROCKY 035 (2023)"

# Reaplica el resto de main sobre el commit aplastado
git rebase --onto importacion-2023 "$LAST_AAA" main
git branch -D importacion-2023
```

Si hay commits «aaa» intercalados con otros (no sólo al principio), sustituye
el bloque anterior por un `git rebase -i "$ROOT"` marcando como `squash` cada
línea «aaa»; es el único paso que no se puede automatizar sin revisar.

## 3. Limpiar referencias de herramientas y ramas muertas

```bash
git for-each-ref --format='%(refname)' refs/codex | xargs -n1 git update-ref -d
git branch -D codex/captura-web-completa-con-playwright codex/release-2026-08-21 2>/dev/null || true
git push origin --delete codex/release-2026-08-21 2>/dev/null || true
```

## 4. Recoger basura y comprobar

```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git count-objects -vH
git rev-list --all --objects \
  | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
  | awk '$1=="blob" && $3 > 1000000'          # no debe listar los ficheros purgados
git log --all --format='%s' | grep -c '^aaa$' # debe ser 0
npm ci && npm run check                        # el árbol final sigue en verde
```

## 5. Publicar y reclonar

```bash
git remote add origin git@github.com:<org>/<repo>.git   # filter-repo borra el remoto
git push --force --all origin
git push --force --tags origin
```

Después:

1. Cada persona borra su clon y vuelve a clonar; no se hace `git pull` sobre
   un clon antiguo (volvería a subir los blobs purgados).
2. En el servidor de despliegue se reclona la release desde el historial
   nuevo antes del siguiente `docker build`.
3. Activa en el proveedor Git la protección contra secretos y el bloqueo de
   push de ficheros grandes.
4. Conserva `../rocky035-web-backup.git` fuera del alcance de cualquier
   automatización hasta confirmar que todo funciona; después, bórralo.

## 6. Rotación de credenciales

Purgar el historial no invalida lo que ya se filtró. Antes o inmediatamente
después de la reescritura, rota en el proveedor y en `/etc/rocky035/rocky.env`
del servidor (y reinicia el contenedor):

| Credencial | Dónde se rota | Notas |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Panel de OpenRouter | Clave nueva sólo con modelos `:free` en la allowlist, sin BYOK ni recarga automática. Revoca la anterior. |
| `SHOPIFY_CLIENT_SECRET` y `SHOPIFY_CLIENT_ID` | Dev Dashboard de Shopify | Regenera el secreto; vuelve a suscribir el webhook `orders/paid` si cambia la firma. |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Headless channel de Shopify | Token privado nuevo; el antiguo se elimina. |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | Customer Account API | Sólo si apareció en un `.env` filtrado. |
| `SITE_ACCESS_PASSWORD` | Entorno del servidor | Contraseña nueva de 12+ caracteres; reiniciar invalida todas las concesiones. |
| `APP_ENCRYPTION_KEY` | Entorno del servidor | Rotarla pierde sesiones, carritos, tokens de cliente y la lista de avisos. Exporta antes los avisos (`npm run avisos:exportar`) y decide si compensa; si la clave nunca salió del servidor, puede quedarse. |
| Token del túnel de Cloudflare | Panel de Cloudflare Zero Trust | Sólo si el fichero de configuración del túnel estuvo en Git. |

Registra fecha, credencial y persona en el gestor de incidencias, y confirma
en cada proveedor que los valores anteriores han dejado de funcionar.
