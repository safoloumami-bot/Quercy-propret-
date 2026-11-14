-- AlterTable
ALTER TABLE "site" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "site_info" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'site_agents',
    "agentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_info_organizationId_siteId_idx" ON "site_info"("organizationId", "siteId");

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "site"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_info" ADD CONSTRAINT "site_info_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_info" ADD CONSTRAINT "site_info_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_info" ADD CONSTRAINT "site_info_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_info" ADD CONSTRAINT "site_info_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;


SELECT quercy_install_tenant_security();
