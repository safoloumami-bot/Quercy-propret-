-- AlterTable
ALTER TABLE "cleaning_contract" ADD COLUMN     "billingMode" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'recurring',
ADD COLUMN     "nextRevisionDate" TIMESTAMP(3),
ADD COLUMN     "priceRevisionPct" DOUBLE PRECISION,
ADD COLUMN     "tacitRenewal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visitPriceCents" INTEGER;

-- AlterTable
ALTER TABLE "intervention" ADD COLUMN     "extraPriceCents" INTEGER,
ADD COLUMN     "extraStatus" TEXT,
ADD COLUMN     "invoiceId" TEXT;

-- AlterTable
ALTER TABLE "sales_document" ADD COLUMN     "billingPeriod" TEXT;

-- AlterTable
ALTER TABLE "sales_settings" ADD COLUMN     "defaultHourlyCostCents" INTEGER,
ADD COLUMN     "defaultKmCostCents" INTEGER,
ADD COLUMN     "minMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE "estimate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT,
    "title" TEXT NOT NULL,
    "companyId" TEXT,
    "siteId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'one_off',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "people" INTEGER NOT NULL DEFAULT 1,
    "hoursPerPerson" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "hourlyCostCents" INTEGER NOT NULL DEFAULT 0,
    "km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kmCostCents" INTEGER NOT NULL DEFAULT 0,
    "travelMinutes" INTEGER NOT NULL DEFAULT 0,
    "productsCents" INTEGER NOT NULL DEFAULT 0,
    "equipmentCents" INTEGER NOT NULL DEFAULT 0,
    "rentalCents" INTEGER NOT NULL DEFAULT 0,
    "subcontractCents" INTEGER NOT NULL DEFAULT 0,
    "otherCents" INTEGER NOT NULL DEFAULT 0,
    "targetMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "priceCents" INTEGER,
    "weekdays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startTime" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "minPriceCents" INTEGER NOT NULL DEFAULT 0,
    "advisedPriceCents" INTEGER NOT NULL DEFAULT 0,
    "marginPct" DOUBLE PRECISION,
    "monthlyPriceCents" INTEGER,
    "ownerApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "ownerApprovedById" TEXT,
    "ownerApprovedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "quoteId" TEXT,
    "contractId" TEXT,
    "notes" TEXT,
    "ownerId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "estimate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_organizationId_deletedAt_idx" ON "estimate"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "estimate_organizationId_status_idx" ON "estimate"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "intervention" ADD CONSTRAINT "intervention_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "sales_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_ownerApprovedById_fkey" FOREIGN KEY ("ownerApprovedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "sales_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "cleaning_contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Isolation par entreprise (RLS) et garde « même entreprise » sur la nouvelle table.
SELECT quercy_install_tenant_security();
