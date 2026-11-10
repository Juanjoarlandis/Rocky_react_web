#!/bin/bash
# Copia el árbol de trabajo (sin .env, sin .git) a $1, construye y deja listo para instancia.mjs.
set -e
REPO="${ROCKY_SRC:?ruta del repo de trabajo}"
DEST="$1"
export PATH="$HOME/.nvm/versions/node/v24.11.0/bin:$PATH"
mkdir -p "$DEST"
rsync -a --delete --exclude node_modules --exclude .git --exclude '.env' --exclude '.env.*' --include '.env.example' --exclude dist --exclude .data --exclude .claude --exclude posters --exclude prompts-munecos --exclude assets-master --exclude coverage --exclude output --exclude docs "$REPO/" "$DEST/"
cp "$REPO/.env.example" "$DEST/.env.example"
ln -sfn "$REPO/node_modules" "$DEST/node_modules"
(cd "$DEST" && npm run build > build.log 2>&1 && tail -1 build.log)
