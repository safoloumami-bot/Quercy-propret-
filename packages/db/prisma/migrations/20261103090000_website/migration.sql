-- Module « Site web » : site modifiable depuis l'espace de l'entreprise.
CREATE TABLE "website" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "theme" JSONB NOT NULL DEFAULT '{}',
    "draft" JSONB NOT NULL,
    "published" JSONB,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "website_organizationId_key" ON "website"("organizationId");
CREATE UNIQUE INDEX "website_slug_key" ON "website"("slug");
-- Un domaine personnel ne peut appartenir qu'à un site (recherche par domaine).
CREATE INDEX "website_domains_idx" ON "website" USING GIN ("domains");

ALTER TABLE "website" ADD CONSTRAINT "website_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Isolation par entreprise (RLS).
SELECT quercy_install_tenant_security();
