-- AlterTable
ALTER TABLE "intervention" ADD COLUMN     "fieldData" JSONB,
ADD COLUMN     "reportNumber" TEXT;

-- CreateTable
CREATE TABLE "field_access" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "pinSalt" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'agent',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "field_access_organizationId_code_key" ON "field_access"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "field_access_organizationId_userId_key" ON "field_access"("organizationId", "userId");

-- AddForeignKey
ALTER TABLE "field_access" ADD CONSTRAINT "field_access_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_access" ADD CONSTRAINT "field_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
