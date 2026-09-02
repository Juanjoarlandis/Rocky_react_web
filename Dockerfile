# syntax=docker/dockerfile:1

FROM node:24.19.0-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS build

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
RUN npm prune --omit=dev

FROM node:24.19.0-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS runtime

ENV NODE_ENV=production \
    PORT=3001

WORKDIR /app

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/shared ./shared
# El servidor lee el catálogo demo con fs para validar los avisos de drop.
COPY --from=build --chown=node:node /app/src/data/demoCatalog.json ./src/data/demoCatalog.json
COPY --from=build --chown=node:node /app/scripts/exportar-avisos.mjs ./scripts/exportar-avisos.mjs
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 3001}/api/health`).then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "server/index.mjs"]
