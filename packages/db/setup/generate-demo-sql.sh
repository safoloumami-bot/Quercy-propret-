#!/usr/bin/env bash
# Régénère setup/quercy-demo-neon.sql : jeu de démonstration « Quercy Propreté » prêt à coller
# dans l'éditeur SQL d'une base déjà migrée (Neon…). Prérequis : PostgreSQL local (ADMIN_URL).
# Usage : ADMIN_URL=postgresql://quercy:quercy@localhost:5432 OWNER_EMAIL=moi@exemple.fr setup/generate-demo-sql.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ADMIN_URL="${ADMIN_URL:-postgresql://quercy:quercy@localhost:5432}"
OWNER_EMAIL="${OWNER_EMAIL:-safoloumami@gmail.com}"
DB="$ADMIN_URL/quercy_demo_export"
ORG="quercy_demo_org"
OUT="setup/quercy-demo-neon.sql"
TMP="$(mktemp)"

psql "$ADMIN_URL/postgres" -qc "DROP DATABASE IF EXISTS quercy_demo_export" -c "CREATE DATABASE quercy_demo_export"
DATABASE_URL="$DB" pnpm exec prisma migrate deploy >/dev/null
DATABASE_URL="$DB" pnpm exec tsx prisma/seed.ts >/dev/null

SRC_ORG="$(psql "$DB" -Atc "select id from organization where name = 'Quercy Propreté'")"
# Adresse (slug) propre à la démonstration : l'espace de la personne peut porter le même nom.
psql "$DB" -qc "UPDATE organization SET name = 'Quercy Propreté (démo)', slug = 'quercy-proprete-demo' WHERE id = '$SRC_ORG'"
psql "$DB" -q <<SQL
DELETE FROM organization WHERE id <> '$SRC_ORG';
DELETE FROM "user" WHERE role = 'admin' OR id NOT IN (SELECT "userId" FROM membership);
DELETE FROM session; DELETE FROM verification;
-- Comptes fictifs : aucune connexion possible (mots de passe de démonstration publics).
DELETE FROM account;
SQL
pg_dump "$DB" --data-only --column-inserts --rows-per-insert=200 --no-owner --no-privileges \
  --exclude-table=_prisma_migrations 2>/dev/null | grep -vE "^(SET |SELECT pg_catalog|--|\\\\|$)" \
  | sed "s/'$SRC_ORG'/'$ORG'/g" > "$TMP"

{
  cat <<SQL
-- Quercy : simulation « Quercy Propreté » (12 mois d'activité, catalogue illustré).
-- À exécuter dans le SQL Editor de Neon. Peut être relancé : l'ancienne démonstration est
-- d'abord supprimée. Le compte $OWNER_EMAIL devient propriétaire de l'espace.
BEGIN;

-- Mise à niveau du schéma (images du catalogue).
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
SELECT md5(random()::text), '$(sha256sum prisma/migrations/20260928140000_product_image/migration.sql | cut -d' ' -f1)', now(), '20260928140000_product_image', 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260928140000_product_image');

-- Démonstration précédente (espace et comptes fictifs @quercy.app).
DELETE FROM audit_log WHERE "organizationId" IN (SELECT m."organizationId" FROM membership m JOIN "user" u ON u.id = m."userId" WHERE u.email = 'demo@quercy.app');
DELETE FROM notification WHERE "organizationId" IN (SELECT m."organizationId" FROM membership m JOIN "user" u ON u.id = m."userId" WHERE u.email = 'demo@quercy.app');
DELETE FROM organization WHERE id IN (SELECT m."organizationId" FROM membership m JOIN "user" u ON u.id = m."userId" WHERE u.email = 'demo@quercy.app') OR id = '$ORG';
DELETE FROM "user" WHERE email LIKE '%@quercy.app';

SQL
  cat "$TMP"
  cat <<SQL

-- Votre compte : propriétaire de l'espace, qui devient l'espace ouvert à la prochaine page.
INSERT INTO membership (id, "organizationId", "userId", "roleId", "createdAt", "updatedAt")
SELECT 'demo_owner_' || u.id, r."organizationId", u.id, r.id, now(), now()
FROM "user" u JOIN role r ON r."organizationId" = '$ORG' AND r."systemKey" = 'owner'
WHERE u.email = '$OWNER_EMAIL';
UPDATE session SET "activeOrganizationId" = '$ORG'
WHERE "userId" IN (SELECT id FROM "user" WHERE email = '$OWNER_EMAIL');
-- Une partie du travail vous est attribuée (widgets « Mes tâches », « Mes activités »…).
UPDATE task SET "ownerId" = (SELECT id FROM "user" WHERE email = '$OWNER_EMAIL')
WHERE id IN (SELECT id FROM task WHERE "organizationId" = '$ORG' ORDER BY id LIMIT 30);
UPDATE activity SET "ownerId" = (SELECT id FROM "user" WHERE email = '$OWNER_EMAIL')
WHERE id IN (SELECT id FROM activity WHERE "organizationId" = '$ORG' ORDER BY id LIMIT 60);
UPDATE ticket SET "ownerId" = (SELECT id FROM "user" WHERE email = '$OWNER_EMAIL')
WHERE id IN (SELECT id FROM ticket WHERE "organizationId" = '$ORG' ORDER BY id LIMIT 10);
UPDATE event SET "ownerId" = (SELECT id FROM "user" WHERE email = '$OWNER_EMAIL')
WHERE id IN (SELECT id FROM event WHERE "organizationId" = '$ORG' ORDER BY id LIMIT 15);
UPDATE deal SET "ownerId" = (SELECT id FROM "user" WHERE email = '$OWNER_EMAIL')
WHERE id IN (SELECT id FROM deal WHERE "organizationId" = '$ORG' ORDER BY id LIMIT 12);
INSERT INTO notification (id, "organizationId", "userId", type, title, url, "createdAt")
SELECT 'demo_welcome_' || u.id, '$ORG', u.id, 'welcome',
  'Bienvenue dans la démonstration Quercy Propreté : explorez librement, tout est modifiable.', '/', now()
FROM "user" u WHERE u.email = '$OWNER_EMAIL';
COMMIT;
SQL
} > "$OUT"
rm -f "$TMP"
psql "$ADMIN_URL/postgres" -qc "DROP DATABASE IF EXISTS quercy_demo_export"
echo "$OUT : $(wc -c < "$OUT") octets"
