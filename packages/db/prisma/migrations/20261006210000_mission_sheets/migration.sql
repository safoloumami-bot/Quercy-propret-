-- AlterTable
ALTER TABLE "intervention" ADD COLUMN     "missionSheetId" TEXT,
ADD COLUMN     "missionVersion" INTEGER;

-- AlterTable
ALTER TABLE "intervention_task" ADD COLUMN     "frequency" TEXT,
ADD COLUMN     "photoRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "mission_sheet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "serviceLineId" TEXT,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "procedure" TEXT,
    "products" TEXT,
    "equipment" TEXT,
    "instructions" TEXT,
    "durationMinutes" INTEGER,
    "createdById" TEXT,
    "updatedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'each_visit',
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "photoRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mission_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_sheet_version" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_sheet_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_sheet_organizationId_siteId_idx" ON "mission_sheet"("organizationId", "siteId");

-- CreateIndex
CREATE INDEX "mission_task_sheetId_sortOrder_idx" ON "mission_task"("sheetId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "mission_sheet_version_sheetId_version_key" ON "mission_sheet_version"("sheetId", "version");

-- AddForeignKey
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_missionSheetId_fkey" FOREIGN KEY ("missionSheetId") REFERENCES "mission_sheet"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_sheet" ADD CONSTRAINT "mission_sheet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_sheet" ADD CONSTRAINT "mission_sheet_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_sheet" ADD CONSTRAINT "mission_sheet_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "service_line"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_sheet" ADD CONSTRAINT "mission_sheet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_sheet" ADD CONSTRAINT "mission_sheet_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_task" ADD CONSTRAINT "mission_task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_task" ADD CONSTRAINT "mission_task_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "mission_sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_sheet_version" ADD CONSTRAINT "mission_sheet_version_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_sheet_version" ADD CONSTRAINT "mission_sheet_version_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "mission_sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_sheet_version" ADD CONSTRAINT "mission_sheet_version_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;


SELECT quercy_install_tenant_security();
