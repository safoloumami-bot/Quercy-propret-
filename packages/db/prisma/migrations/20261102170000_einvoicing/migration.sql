-- Facture électronique : raccordement à une plateforme agréée et suivi des factures.
ALTER TABLE "sales_settings" ADD COLUMN "einvoicingProvider" TEXT,
ADD COLUMN "einvoicingApiKeyEnc" TEXT,
ADD COLUMN "einvoicingAutoSend" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "einvoicingSyncedAt" TIMESTAMP(3);

CREATE TABLE "e_invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "salesDocumentId" TEXT,
    "billId" TEXT,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "history" JSONB NOT NULL DEFAULT '[]',
    "counterpartyName" TEXT,
    "counterpartySiren" TEXT,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "xml" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e_invoice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "e_invoice_organizationId_direction_status_idx" ON "e_invoice"("organizationId", "direction", "status");
CREATE INDEX "e_invoice_salesDocumentId_idx" ON "e_invoice"("salesDocumentId");

ALTER TABLE "e_invoice" ADD CONSTRAINT "e_invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "e_invoice" ADD CONSTRAINT "e_invoice_salesDocumentId_fkey" FOREIGN KEY ("salesDocumentId") REFERENCES "sales_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "e_invoice" ADD CONSTRAINT "e_invoice_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Isolation par entreprise (RLS) et garde « même entreprise » sur la nouvelle table.
SELECT quercy_install_tenant_security();
