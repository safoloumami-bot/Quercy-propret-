-- DropIndex
DROP INDEX "intervention_contractId_date_key";

-- AlterTable
ALTER TABLE "recurrence_series" ADD COLUMN     "holidayCalendar" TEXT NOT NULL DEFAULT 'fr';

-- AlterTable
ALTER TABLE "service_line" ADD COLUMN     "externalRef" TEXT;

-- AlterTable
ALTER TABLE "site" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE INDEX "intervention_contractId_date_idx" ON "intervention"("contractId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "service_line_organizationId_externalRef_key" ON "service_line"("organizationId", "externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "site_organizationId_code_key" ON "site"("organizationId", "code");


-- Les passages des contrats « simples » prennent leur clé de créneau : l'unicité
-- (contrat, jour) est désormais assurée par (entreprise, slotKey), comme pour les séries.
UPDATE "intervention"
SET "slotKey" = 'contrat:' || "contractId" || ':' || to_char("date", 'YYYY-MM-DD')
WHERE "contractId" IS NOT NULL AND "seriesId" IS NULL AND "slotKey" IS NULL;

SELECT quercy_install_tenant_security();
