-- Corps de métier de l'espace
ALTER TABLE "organization" ADD COLUMN "trade" TEXT;

-- Mentions des devis et factures (assurance décennale, TVA réduite des travaux)
ALTER TABLE "sales_settings" ADD COLUMN "insuranceMention" TEXT;
ALTER TABLE "sales_settings" ADD COLUMN "renovationVatMention" BOOLEAN NOT NULL DEFAULT false;
