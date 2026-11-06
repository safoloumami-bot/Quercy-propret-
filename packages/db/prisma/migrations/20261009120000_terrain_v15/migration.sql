-- AlterTable
ALTER TABLE "field_access" ADD COLUMN     "color" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "sample" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "quote_request" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'nouvelle',
    "source" TEXT NOT NULL DEFAULT 'site',
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "service" TEXT,
    "message" TEXT,
    "address" TEXT,
    "city" TEXT,
    "interventionId" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_review" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "comment" TEXT,
    "ratedAt" TIMESTAMP(3),
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terrain_token" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'qr',
    "companyId" TEXT,
    "label" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terrain_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terrain_alert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terrain_alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_request_organizationId_status_idx" ON "quote_request"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "client_review_interventionId_key" ON "client_review"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "client_review_token_key" ON "client_review"("token");

-- CreateIndex
CREATE INDEX "client_review_organizationId_ratedAt_idx" ON "client_review"("organizationId", "ratedAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscription_organizationId_userId_idx" ON "push_subscription"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "terrain_token_token_key" ON "terrain_token"("token");

-- CreateIndex
CREATE INDEX "terrain_token_organizationId_kind_idx" ON "terrain_token"("organizationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "terrain_alert_organizationId_key_key" ON "terrain_alert"("organizationId", "key");

-- AddForeignKey
ALTER TABLE "quote_request" ADD CONSTRAINT "quote_request_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_request" ADD CONSTRAINT "quote_request_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_review" ADD CONSTRAINT "client_review_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_review" ADD CONSTRAINT "client_review_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "intervention"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terrain_token" ADD CONSTRAINT "terrain_token_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terrain_token" ADD CONSTRAINT "terrain_token_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terrain_alert" ADD CONSTRAINT "terrain_alert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Isolation par entreprise (RLS) et garde « même entreprise » sur les nouvelles tables.
SELECT quercy_install_tenant_security();
