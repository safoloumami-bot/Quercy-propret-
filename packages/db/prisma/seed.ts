import { DEFAULT_ACCENT, MODULE_KEYS } from "@quercy/core";

import { prisma } from "../src/client";
import { SYSTEM_ROLE_SEEDS } from "../src/roles";

/**
 * Données de démonstration — socle (phase 1) : un espace, ses rôles et son propriétaire.
 * Le jeu complet sur 12 mois (clients, factures, projets…) s'ajoute avec les modules.
 */
async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "quercy-proprete" },
    update: { logoUrl: "/brand/quercy-mark.png" },
    create: {
      name: "Quercy Propreté",
      logoUrl: "/brand/quercy-mark.png",
      slug: "quercy-proprete",
      industry: "Services aux entreprises — nettoyage",
      size: "11-50",
      plan: "BUSINESS",
      modules: [...MODULE_KEYS],
      preferences: {
        locale: "fr",
        currency: "EUR",
        timezone: "Europe/Paris",
        dateFormat: "dd/MM/yyyy",
        accentColor: DEFAULT_ACCENT,
      },
      onboardedAt: new Date(),
    },
  });

  for (const role of SYSTEM_ROLE_SEEDS) {
    await prisma.role.upsert({
      where: { organizationId_name: { organizationId: org.id, name: role.name } },
      update: { permissions: role.permissions },
      create: { organizationId: org.id, ...role },
    });
  }

  const ownerRole = await prisma.role.findFirstOrThrow({
    where: { organizationId: org.id, systemKey: "owner" },
  });

  const owner = await prisma.user.upsert({
    where: { email: "demo@quercy.app" },
    update: {},
    create: {
      email: "demo@quercy.app",
      emailVerified: true,
      name: "Camille Delmas",
      preferences: { theme: "system", density: "normal" },
    },
  });

  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: owner.id } },
    update: {},
    create: { organizationId: org.id, userId: owner.id, roleId: ownerRole.id },
  });

  console.info(`Espace de démonstration prêt : ${org.name} (${owner.email})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
