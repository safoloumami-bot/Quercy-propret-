# Images de production Quercy (une seule construction, trois cibles) :
#   docker build --target web -t quercy-web .
#   docker build --target worker -t quercy-worker .
#   docker build --target migrate -t quercy-migrate .
# Voir docker-compose.prod.yml pour un déploiement complet.

ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS base
# OpenSSL : requis par le moteur de Prisma (déjà présent dans l'image Node complète).
RUN command -v openssl >/dev/null || (apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*)
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 CI=1
WORKDIR /app
# Certificat d'autorité facultatif (réseau d'entreprise avec proxy) : --secret id=ca,src=…
RUN --mount=type=secret,id=ca,required=false \
  NODE_EXTRA_CA_CERTS=$([ -f /run/secrets/ca ] && echo /run/secrets/ca) corepack enable \
  && NODE_EXTRA_CA_CERTS=$([ -f /run/secrets/ca ] && echo /run/secrets/ca) corepack prepare pnpm@10.33.0 --activate

FROM base AS build
COPY . .
# L'application de bureau se construit à part (CI dédiée) : exclue de l'image serveur.
RUN --mount=type=secret,id=ca,required=false \
  NODE_EXTRA_CA_CERTS=$([ -f /run/secrets/ca ] && echo /run/secrets/ca) \
  pnpm install --frozen-lockfile --filter '!@quercy/desktop...'
RUN pnpm --filter @quercy/db generate && pnpm --filter @quercy/web build \
  && rm -rf apps/web/.next/cache

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node

# Démarrage sans pnpm ni réseau : les binaires installés sont appelés directement.
FROM runtime AS web
ENV PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start"]

FROM runtime AS worker
WORKDIR /app/apps/worker
CMD ["node_modules/.bin/tsx", "src/index.ts"]

FROM runtime AS migrate
WORKDIR /app/packages/db
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]
