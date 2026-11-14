-- Valeurs de fonctionnement de la plateforme (dernière exécution des tâches quotidiennes).
CREATE TABLE "platform_state" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_state_pkey" PRIMARY KEY ("key")
);
