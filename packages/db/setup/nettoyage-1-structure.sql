DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260928150000_cleaning_module') THEN
EXECUTE $m$
CREATE TABLE "site" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "surfaceM2" DOUBLE PRECISION,
    "openingHours" TEXT,
    "accessCode" TEXT,
    "keys" TEXT,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "ownerId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "cleaning_contract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT,
    "siteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "weekdays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startTime" TEXT,
    "durationMinutes" INTEGER,
    "agentId" TEXT,
    "monthlyPriceCents" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "generatedUntil" TIMESTAMP(3),
    "description" TEXT,
    "ownerId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "cleaning_contract_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "intervention" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "siteId" TEXT,
    "contractId" TEXT,
    "companyId" TEXT,
    "ownerId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "durationMinutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "workedMinutes" INTEGER,
    "signatureUrl" TEXT,
    "signedBy" TEXT,
    "photoUrl" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "intervention_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "inspection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "siteId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "floors" BOOLEAN NOT NULL DEFAULT false,
    "sanitary" BOOLEAN NOT NULL DEFAULT false,
    "dusting" BOOLEAN NOT NULL DEFAULT false,
    "windows" BOOLEAN NOT NULL DEFAULT false,
    "bins" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "result" TEXT,
    "photoUrl" TEXT,
    "comments" TEXT,
    "ownerId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "inspection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "site_organizationId_deletedAt_idx" ON "site"("organizationId", "deletedAt");
CREATE INDEX "cleaning_contract_organizationId_deletedAt_idx" ON "cleaning_contract"("organizationId", "deletedAt");
CREATE INDEX "intervention_organizationId_deletedAt_date_idx" ON "intervention"("organizationId", "deletedAt", "date");
CREATE INDEX "intervention_organizationId_ownerId_date_idx" ON "intervention"("organizationId", "ownerId", "date");
CREATE UNIQUE INDEX "intervention_contractId_date_key" ON "intervention"("contractId", "date");
CREATE INDEX "inspection_organizationId_deletedAt_idx" ON "inspection"("organizationId", "deletedAt");
ALTER TABLE "site" ADD CONSTRAINT "site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site" ADD CONSTRAINT "site_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "site" ADD CONSTRAINT "site_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cleaning_contract" ADD CONSTRAINT "cleaning_contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cleaning_contract" ADD CONSTRAINT "cleaning_contract_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cleaning_contract" ADD CONSTRAINT "cleaning_contract_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cleaning_contract" ADD CONSTRAINT "cleaning_contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cleaning_contract" ADD CONSTRAINT "cleaning_contract_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "cleaning_contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection" ADD CONSTRAINT "inspection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection" ADD CONSTRAINT "inspection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection" ADD CONSTRAINT "inspection_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "role" SET "permissions" = "permissions" || jsonb_build_object('cleaning', '{"view":"all","create":"all","update":"all","delete":"all","export":"all","admin":"all"}'::jsonb)
WHERE "systemKey" IN ('owner', 'admin') AND NOT ("permissions" ? 'cleaning');
UPDATE "role" SET "permissions" = "permissions" || jsonb_build_object('cleaning', '{"view":"team","create":"team","update":"team","delete":"team","export":"team"}'::jsonb)
WHERE "systemKey" = 'manager' AND NOT ("permissions" ? 'cleaning');
UPDATE "role" SET "permissions" = "permissions" || jsonb_build_object('cleaning', '{"view":"all","create":"own","update":"own","delete":"own"}'::jsonb)
WHERE "systemKey" = 'member' AND NOT ("permissions" ? 'cleaning');
UPDATE "role" SET "permissions" = "permissions" || jsonb_build_object('cleaning', '{"view":"all"}'::jsonb)
WHERE "systemKey" = 'viewer' AND NOT ("permissions" ? 'cleaning');
UPDATE "organization" SET "modules" = array_append("modules", 'cleaning')
WHERE "industry" = 'cleaning' AND NOT ('cleaning' = ANY("modules"));
$m$;
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (md5(random()::text), '835cf5b3a5b7b8ffd24a59194326ffc97f7e6e4561b97fdefbb575e903f495f2', now(), '20260928150000_cleaning_module', 1);
END IF;
END $$;
