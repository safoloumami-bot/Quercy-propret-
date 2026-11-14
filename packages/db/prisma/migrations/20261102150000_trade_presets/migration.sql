-- Préréglages de corps de métier modifiables par l'équipe (super-admin).
CREATE TABLE "TradePreset" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hint" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "catalog" JSONB NOT NULL DEFAULT '[]',
    "decennial" BOOLEAN NOT NULL DEFAULT false,
    "renovationVat" BOOLEAN NOT NULL DEFAULT false,
    "assistant" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradePreset_pkey" PRIMARY KEY ("key")
);

-- Table de la plateforme : les espaces clients peuvent la lire, jamais la modifier.
REVOKE INSERT, UPDATE, DELETE ON "TradePreset" FROM quercy_tenant;
