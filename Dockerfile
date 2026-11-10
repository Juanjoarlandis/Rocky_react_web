# syntax=docker/dockerfile:1

# La etapa de build corre en la plataforma de quien construye, no en la de
# destino: instala, prueba y compila sin emulación aunque la imagen sea para
# otra arquitectura (se publica desde un x86-64 para una Raspberry ARM64). Vale
# porque lo que produce es JavaScript y ficheros estáticos, y porque la etapa de
# runtime no ejecuta nada: solo copia. scripts/release/imagen.test.mjs falla si
# deja de ser cierto (un RUN en runtime o una dependencia nativa en producción).
FROM --platform=$BUILDPLATFORM node:24.19.0-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.mjs ./
COPY public ./public
COPY scripts ./scripts
COPY server ./server
COPY shared ./shared
COPY src ./src

RUN npm run test:run && npm run build
# Fuera las dependencias de desarrollo y la caché de las pruebas, que cambia en
# cada build (duraciones): con ella dentro, dos builds del mismo commit nunca
# darían las mismas huellas.
RUN npm prune --omit=dev && rm -rf node_modules/.vite

FROM node:24.19.0-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS runtime

# V8 no ve el límite de memoria del contenedor: sin tope cree que tiene 4 GB y
# deja crecer la basura hasta que el kernel lo mata (medido: muere con 128 MB).
# Con 64 MB de heap viejo, 4 MB de espacio joven y dos arenas de malloc aguanta
# la carga de referencia con un pico de 77 MB. Una máquina mayor puede subirlo
# desde su fichero de entorno, sin reconstruir la imagen.
ENV NODE_ENV=production \
    PORT=3001 \
    NODE_OPTIONS="--max-old-space-size=64 --max-semi-space-size=4" \
    MALLOC_ARENA_MAX=2

WORKDIR /app

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/shared ./shared
# El servidor lee el catálogo demo con fs para validar los avisos de drop.
COPY --from=build --chown=node:node /app/src/data/demoCatalog.json ./src/data/demoCatalog.json
COPY --from=build --chown=node:node /app/scripts/exportar-avisos.mjs ./scripts/exportar-avisos.mjs
COPY --from=build --chown=node:node /app/scripts/enviar-avisos.mjs ./scripts/enviar-avisos.mjs
COPY --from=build --chown=node:node /app/scripts/healthcheck.sh ./scripts/healthcheck.sh
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 3001

# La sonda no arranca Node: bash abre un socket y lee el estado de /api/health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["bash", "scripts/healthcheck.sh"]

CMD ["node", "server/index.mjs"]
