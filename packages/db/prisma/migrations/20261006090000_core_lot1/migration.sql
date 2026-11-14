-- AlterTable
ALTER TABLE "intervention" ADD COLUMN     "actualAgentId" TEXT,
ADD COLUMN     "fieldNotes" TEXT,
ADD COLUMN     "originalPlannedDate" TIMESTAMP(3),
ADD COLUMN     "replacementAgentId" TEXT,
ADD COLUMN     "ruleVersionId" TEXT,
ADD COLUMN     "seriesId" TEXT,
ADD COLUMN     "serviceLineId" TEXT,
ADD COLUMN     "slotKey" TEXT;

-- CreateTable
CREATE TABLE "service_line" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activity" TEXT,
    "description" TEXT,
    "plannedAgentId" TEXT,
    "startTime" TEXT,
    "durationMinutes" INTEGER,
    "unitPriceCents" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurrence_series" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceLineId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "holidayPolicy" TEXT NOT NULL DEFAULT 'keep',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "generatedUntil" TIMESTAMP(3),
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurrence_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurrence_rule_version" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "rule" JSONB NOT NULL,
    "startTime" TEXT,
    "durationMinutes" INTEGER,
    "plannedAgentId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurrence_rule_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_closure" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_closure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervention_event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "intervention_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervention_proof" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "siteId" TEXT,
    "type" TEXT NOT NULL,
    "fileId" TEXT,
    "area" TEXT,
    "caption" TEXT,
    "authorId" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intervention_proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT,
    "interventionId" TEXT,
    "type" TEXT NOT NULL,
    "location" TEXT,
    "comment" TEXT,
    "photoFileId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'reported',
    "source" TEXT NOT NULL DEFAULT 'agent',
    "reportedById" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "visibleToClient" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anomaly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_line_organizationId_contractId_idx" ON "service_line"("organizationId", "contractId");

-- CreateIndex
CREATE INDEX "service_line_organizationId_siteId_idx" ON "service_line"("organizationId", "siteId");

-- CreateIndex
CREATE INDEX "recurrence_series_organizationId_status_idx" ON "recurrence_series"("organizationId", "status");

-- CreateIndex
CREATE INDEX "recurrence_rule_version_organizationId_seriesId_idx" ON "recurrence_rule_version"("organizationId", "seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "recurrence_rule_version_seriesId_version_key" ON "recurrence_rule_version"("seriesId", "version");

-- CreateIndex
CREATE INDEX "site_closure_organizationId_siteId_idx" ON "site_closure"("organizationId", "siteId");

-- CreateIndex
CREATE INDEX "intervention_event_interventionId_at_idx" ON "intervention_event"("interventionId", "at");

-- CreateIndex
CREATE INDEX "intervention_event_organizationId_type_at_idx" ON "intervention_event"("organizationId", "type", "at");

-- CreateIndex
CREATE INDEX "intervention_proof_organizationId_interventionId_idx" ON "intervention_proof"("organizationId", "interventionId");

-- CreateIndex
CREATE INDEX "anomaly_organizationId_status_idx" ON "anomaly"("organizationId", "status");

-- CreateIndex
CREATE INDEX "anomaly_organizationId_siteId_idx" ON "anomaly"("organizationId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "intervention_organizationId_slotKey_key" ON "intervention"("organizationId", "slotKey");

-- AddForeignKey
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "service_line"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "recurrence_series"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "recurrence_rule_version"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_replacementAgentId_fkey" FOREIGN KEY ("replacementAgentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_actualAgentId_fkey" FOREIGN KEY ("actualAgentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_line" ADD CONSTRAINT "service_line_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_line" ADD CONSTRAINT "service_line_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "cleaning_contract"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_line" ADD CONSTRAINT "service_line_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_line" ADD CONSTRAINT "service_line_plannedAgentId_fkey" FOREIGN KEY ("plannedAgentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "service_line"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_rule_version" ADD CONSTRAINT "recurrence_rule_version_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_rule_version" ADD CONSTRAINT "recurrence_rule_version_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "recurrence_series"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_rule_version" ADD CONSTRAINT "recurrence_rule_version_plannedAgentId_fkey" FOREIGN KEY ("plannedAgentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_rule_version" ADD CONSTRAINT "recurrence_rule_version_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_closure" ADD CONSTRAINT "site_closure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_closure" ADD CONSTRAINT "site_closure_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_event" ADD CONSTRAINT "intervention_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_event" ADD CONSTRAINT "intervention_event_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "intervention"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_event" ADD CONSTRAINT "intervention_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_proof" ADD CONSTRAINT "intervention_proof_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_proof" ADD CONSTRAINT "intervention_proof_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "intervention"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_proof" ADD CONSTRAINT "intervention_proof_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_proof" ADD CONSTRAINT "intervention_proof_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_file"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_proof" ADD CONSTRAINT "intervention_proof_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly" ADD CONSTRAINT "anomaly_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly" ADD CONSTRAINT "anomaly_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly" ADD CONSTRAINT "anomaly_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "intervention"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly" ADD CONSTRAINT "anomaly_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "stored_file"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly" ADD CONSTRAINT "anomaly_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly" ADD CONSTRAINT "anomaly_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly" ADD CONSTRAINT "anomaly_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- =====================================================================================
-- Sécurité de la base : isolation des entreprises garantie par PostgreSQL lui-même.
--
-- 1. Rôle « quercy_tenant », sans passe-droit RLS : toute requête faite pour le compte
--    d'une entreprise s'exécute sous ce rôle, avec app.org_id = l'entreprise (voir forTenant).
-- 2. RLS : sous ce rôle, chaque table à "organizationId" n'expose que les lignes de
--    l'entreprise courante, en lecture comme en écriture.
-- 3. Garde « même entreprise » : une ligne ne peut jamais pointer vers une ligne d'une autre
--    entreprise, quel que soit le rôle (y compris les tâches système).
-- quercy_install_tenant_security() est idempotente : chaque future migration qui ajoute une
-- table métier la rappelle.
-- =====================================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quercy_tenant') THEN
    CREATE ROLE quercy_tenant NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

GRANT quercy_tenant TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO quercy_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO quercy_tenant;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO quercy_tenant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO quercy_tenant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO quercy_tenant;

CREATE OR REPLACE FUNCTION quercy_tenant_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  i int := 0;
  col text;
  tbl text;
  val text;
  old_val text;
  ref_org text;
  must_check boolean;
BEGIN
  WHILE i < TG_NARGS LOOP
    col := TG_ARGV[i];
    tbl := TG_ARGV[i + 1];
    EXECUTE format('SELECT ($1).%I::text', col) INTO val USING NEW;
    IF val IS NOT NULL THEN
      IF TG_OP = 'INSERT' THEN
        must_check := true;
      ELSE
        EXECUTE format('SELECT ($1).%I::text', col) INTO old_val USING OLD;
        must_check := old_val IS DISTINCT FROM val
          OR OLD."organizationId" IS DISTINCT FROM NEW."organizationId";
      END IF;
      IF must_check THEN
        EXECUTE format('SELECT "organizationId" FROM %I WHERE id = $1', tbl) INTO ref_org USING val;
        IF ref_org IS NOT NULL AND ref_org <> NEW."organizationId" THEN
          RAISE EXCEPTION 'Référence entre entreprises refusée : %.% -> %', TG_TABLE_NAME, col, tbl
            USING ERRCODE = '23503';
        END IF;
      END IF;
    END IF;
    i := i + 2;
  END LOOP;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION quercy_install_tenant_security() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  t record;
  args text;
BEGIN
  FOR t IN
    SELECT c.oid AS oid, c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'organizationId' AND NOT a.attisdropped
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS quercy_tenant_isolation ON %I', t.tbl);
    EXECUTE format(
      'CREATE POLICY quercy_tenant_isolation ON %I TO quercy_tenant '
      'USING ("organizationId" = current_setting(''app.org_id'', true)) '
      'WITH CHECK ("organizationId" = current_setting(''app.org_id'', true))',
      t.tbl
    );

    SELECT string_agg(format('%L, %L', ca.attname, rc.relname), ', ' ORDER BY ca.attname)
    INTO args
    FROM pg_constraint con
    JOIN pg_class rc ON rc.oid = con.confrelid
    JOIN pg_attribute ca ON ca.attrelid = con.conrelid AND ca.attnum = con.conkey[1]
    WHERE con.contype = 'f'
      AND con.conrelid = t.oid
      AND array_length(con.conkey, 1) = 1
      AND ca.attname <> 'organizationId'
      AND EXISTS (
        SELECT 1 FROM pg_attribute ra
        WHERE ra.attrelid = rc.oid AND ra.attname = 'organizationId' AND NOT ra.attisdropped
      );

    EXECUTE format('DROP TRIGGER IF EXISTS quercy_tenant_guard ON %I', t.tbl);
    IF args IS NOT NULL THEN
      EXECUTE format(
        'CREATE TRIGGER quercy_tenant_guard BEFORE INSERT OR UPDATE ON %I '
        'FOR EACH ROW EXECUTE FUNCTION quercy_tenant_guard(%s)',
        t.tbl, args
      );
    END IF;
  END LOOP;
END $$;

SELECT quercy_install_tenant_security();

-- Rôle prédéfini « Intervenant » (worker) : son planning et ses missions, jamais de suppression.
INSERT INTO "role" ("id", "organizationId", "name", "description", "systemKey", "permissions", "createdAt", "updatedAt")
SELECT
  'role_worker_' || o."id",
  o."id",
  'Intervenant',
  NULL,
  'worker',
  '{"cleaning": {"view": "own", "create": "own", "update": "own"}}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "role" r
  WHERE r."organizationId" = o."id" AND (r."systemKey" = 'worker' OR r."name" = 'Intervenant')
);
