-- CreateTable
CREATE TABLE "duplicate_dismissal" (
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "firstId" TEXT NOT NULL,
    "secondId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_dismissal_pkey" PRIMARY KEY ("organizationId","entityType","firstId","secondId")
);

-- AddForeignKey
ALTER TABLE "duplicate_dismissal" ADD CONSTRAINT "duplicate_dismissal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

