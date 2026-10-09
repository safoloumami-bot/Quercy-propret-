#!/usr/bin/env bash
# Construction Netlify : client Prisma, mise à jour du schéma de la base, puis application web.
# Les migrations s'appliquent toutes seules à chaque déploiement : plus besoin de l'éditeur SQL.
set -euo pipefail

pnpm --filter @quercy/db generate

if [ "${CONTEXT:-}" = "deploy-preview" ]; then
  echo "Aperçu de déploiement : la base n'est pas modifiée."
elif [ -z "${DATABASE_URL:-}" ]; then
  echo "ATTENTION : DATABASE_URL n'est pas disponible pendant la construction ; schéma non mis à jour."
  echo "Dans Netlify, la variable DATABASE_URL doit avoir la portée « Builds » (ou « All scopes »)."
else
  # Neon : les migrations passent par la connexion directe (sans « -pooler »), le pooler
  # ne gérant pas les verrous utilisés par Prisma Migrate.
  DIRECT_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's/-pooler\././')"
  DATABASE_URL="$DIRECT_URL" pnpm --filter @quercy/db exec prisma migrate deploy
  # Changement de région de la base : copie unique depuis l'ancienne (DB_COPY_FROM), seulement
  # si la nouvelle est vide. Une erreur arrête la construction : la version en ligne ne change pas.
  if [ -n "${DB_COPY_FROM:-}" ]; then
    FROM_DIRECT="$(printf '%s' "$DB_COPY_FROM" | sed -E 's/-pooler\././')"
    (cd packages/db && DB_COPY_FROM="$FROM_DIRECT" DATABASE_URL="$DIRECT_URL" node scripts/copy-database.mjs)
  fi
fi

pnpm --filter @quercy/web build
