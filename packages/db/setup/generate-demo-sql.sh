#!/usr/bin/env bash
# Régénère setup/quercy-demo-neon.sql : jeu de démonstration « Quercy Propreté » prêt à coller
# dans l'éditeur SQL d'une base déjà migrée (Neon…). Prérequis : PostgreSQL local (ADMIN_URL).
# Usage : ADMIN_URL=postgresql://quercy:quercy@localhost:5432 setup/generate-demo-sql.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ADMIN_URL="${ADMIN_URL:-postgresql://quercy:quercy@localhost:5432}"
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

# Mise à niveau du schéma : migrations postérieures au script de base (quercy-base-neon.sql),
# appliquées seulement si elles manquent (le déploiement Netlify les applique aussi).
SCHEMA_UPGRADE="-- Mise à niveau du schéma (si le déploiement ne l'a pas déjà faite)."
for dir in prisma/migrations/2026092814*/ prisma/migrations/2026092815*/; do
  [ -f "$dir/migration.sql" ] || continue
  name="$(basename "$dir")"
  sum="$(sha256sum "$dir/migration.sql" | cut -d' ' -f1)"
  SCHEMA_UPGRADE+="
DO \$\$ BEGIN
IF NOT EXISTS (SELECT 1 FROM \"_prisma_migrations\" WHERE migration_name = '$name') THEN
EXECUTE \$migration\$
$(cat "$dir/migration.sql")
\$migration\$;
INSERT INTO \"_prisma_migrations\" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES (md5(random()::text), '$sum', now(), '$name', 1);
END IF;
END \$\$;
"
done

{
  cat <<SQL
-- Quercy : simulation « Quercy Propreté » (12 mois d'activité, catalogue illustré).
-- À exécuter dans le SQL Editor de Neon. Peut être relancé : l'ancienne démonstration est
-- d'abord supprimée. Tous les comptes créés sur le site deviennent propriétaires de l'espace.
BEGIN;

$SCHEMA_UPGRADE
-- Démonstration précédente (espace et comptes fictifs @quercy.app).
DELETE FROM audit_log WHERE "organizationId" IN (SELECT m."organizationId" FROM membership m JOIN "user" u ON u.id = m."userId" WHERE u.email = 'demo@quercy.app');
DELETE FROM notification WHERE "organizationId" IN (SELECT m."organizationId" FROM membership m JOIN "user" u ON u.id = m."userId" WHERE u.email = 'demo@quercy.app');
DELETE FROM organization WHERE id IN (SELECT m."organizationId" FROM membership m JOIN "user" u ON u.id = m."userId" WHERE u.email = 'demo@quercy.app') OR id = '$ORG';
DELETE FROM "user" WHERE email LIKE '%@quercy.app';

SQL
  cat "$TMP"
  cat <<SQL

-- Tous les comptes du site : propriétaires de l'espace, qui devient l'espace ouvert à la prochaine page.
INSERT INTO membership (id, "organizationId", "userId", "roleId", "createdAt", "updatedAt")
SELECT 'demo_owner_' || u.id, r."organizationId", u.id, r.id, now(), now()
FROM "user" u JOIN role r ON r."organizationId" = '$ORG' AND r."systemKey" = 'owner'
WHERE u.email NOT LIKE '%@quercy.app'
ON CONFLICT ("organizationId", "userId") DO UPDATE SET "deletedAt" = NULL, "roleId" = EXCLUDED."roleId";
UPDATE session SET "activeOrganizationId" = '$ORG'
WHERE "userId" IN (SELECT id FROM "user" WHERE email NOT LIKE '%@quercy.app');
-- Une partie du travail est confiée au premier compte du site (widgets « Mes tâches »,
-- planning, « Ma journée »…).
CREATE TEMP TABLE demo_me ON COMMIT DROP AS
SELECT id FROM "user" WHERE email NOT LIKE '%@quercy.app' ORDER BY "createdAt" LIMIT 1;
UPDATE task SET "ownerId" = (SELECT id FROM demo_me)
WHERE id IN (SELECT id FROM task WHERE "organizationId" = '$ORG' ORDER BY id LIMIT 30) AND EXISTS (SELECT 1 FROM demo_me);
UPDATE activity SET "ownerId" = (SELECT id FROM demo_me)
WHERE id IN (SELECT id FROM activity WHERE "organizationId" = '$ORG' ORDER BY id LIMIT 60) AND EXISTS (SELECT 1 FROM demo_me);
UPDATE ticket SET "ownerId" = (SELECT id FROM demo_me)
WHERE id IN (SELECT id FROM ticket WHERE "organizationId" = '$ORG' ORDER BY id LIMIT 10) AND EXISTS (SELECT 1 FROM demo_me);
UPDATE event SET "ownerId" = (SELECT id FROM demo_me)
WHERE id IN (SELECT id FROM event WHERE "organizationId" = '$ORG' ORDER BY id LIMIT 15) AND EXISTS (SELECT 1 FROM demo_me);
UPDATE deal SET "ownerId" = (SELECT id FROM demo_me)
WHERE id IN (SELECT id FROM deal WHERE "organizationId" = '$ORG' ORDER BY id LIMIT 12) AND EXISTS (SELECT 1 FROM demo_me);
-- Trois contrats d'entretien (et leurs interventions) confiés à ce compte.
CREATE TEMP TABLE demo_contracts ON COMMIT DROP AS
SELECT id FROM cleaning_contract WHERE "organizationId" = '$ORG' AND status = 'active' ORDER BY "createdAt", id LIMIT 3;
UPDATE cleaning_contract SET "agentId" = (SELECT id FROM demo_me)
WHERE id IN (SELECT id FROM demo_contracts) AND EXISTS (SELECT 1 FROM demo_me);
UPDATE intervention SET "ownerId" = (SELECT id FROM demo_me)
WHERE "contractId" IN (SELECT id FROM demo_contracts) AND EXISTS (SELECT 1 FROM demo_me);
INSERT INTO notification (id, "organizationId", "userId", type, title, url, "createdAt")
SELECT 'demo_welcome_' || u.id, '$ORG', u.id, 'welcome',
  'Bienvenue dans la démonstration Quercy Propreté : explorez librement, tout est modifiable.', '/', now()
FROM "user" u WHERE u.email NOT LIKE '%@quercy.app'
ON CONFLICT (id) DO NOTHING;
COMMIT;
SQL
} > "$OUT"
rm -f "$TMP"
psql "$ADMIN_URL/postgres" -qc "DROP DATABASE IF EXISTS quercy_demo_export"
echo "$OUT : $(wc -c < "$OUT") octets"
