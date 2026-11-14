-- Statistiques de visites sans cookie (sites des entreprises et logiciel).
CREATE TABLE "page_view" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "visitor" TEXT NOT NULL,
    "device" TEXT NOT NULL DEFAULT 'desktop',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_view_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "page_view_organizationId_createdAt_idx" ON "page_view"("organizationId", "createdAt");
CREATE INDEX "page_view_kind_createdAt_idx" ON "page_view"("kind", "createdAt");

-- Isolation par entreprise (RLS) : une entreprise ne lit que les visites de son site.
SELECT quercy_install_tenant_security();
