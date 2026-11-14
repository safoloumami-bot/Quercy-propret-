-- CreateTable
CREATE TABLE "terrain_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hourlyRateCents" INTEGER NOT NULL DEFAULT 2800,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "sapNumber" TEXT,
    "sapDate" TEXT,
    "reviewUrl" TEXT,
    "alerts" JSONB NOT NULL DEFAULT '{}',
    "paymentTerms" TEXT,
    "vapidPublicKey" TEXT,
    "vapidPrivateEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terrain_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "terrain_settings_organizationId_key" ON "terrain_settings"("organizationId");

-- AddForeignKey
ALTER TABLE "terrain_settings" ADD CONSTRAINT "terrain_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Isolation par entreprise (RLS) et garde « même entreprise » sur la nouvelle table.
SELECT quercy_install_tenant_security();
