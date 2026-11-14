-- Fichiers rangés dans la base (hébergement sans disque permanent, ex. Render gratuit).
CREATE TABLE "stored_blob" (
    "key" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_blob_pkey" PRIMARY KEY ("key")
);
