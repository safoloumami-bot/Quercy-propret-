import { DEFAULT_ACCENT, MODULE_KEYS, type SystemRoleKey } from "@quercy/core";

import { prisma } from "../src/client";
import { hashPassword } from "../src/password";
import { SYSTEM_ROLE_SEEDS } from "../src/roles";

/** Mot de passe commun des comptes de démonstration (documenté dans le README). */
export const DEMO_PASSWORD = "Quercy-demo-2026";

const PEOPLE: { email: string; name: string; role: SystemRoleKey; team?: string }[] = [
  { email: "demo@quercy.app", name: "Camille Delmas", role: "owner" },
  { email: "julien.marty@quercy.app", name: "Julien Marty", role: "manager", team: "Commercial" },
  { email: "sophie.lacombe@quercy.app", name: "Sophie Lacombe", role: "member", team: "Terrain" },
  { email: "nadia.benali@quercy.app", name: "Nadia Benali", role: "accountant" },
  { email: "lucas.roux@quercy.app", name: "Lucas Roux", role: "viewer", team: "Terrain" },
];

/**
 * Données de démonstration — socle : un espace, ses rôles, cinq comptes (un par rôle
 * principal) et deux équipes. Idempotent : peut être relancé sans doublon.
 * Le jeu complet sur 12 mois (clients, factures, projets…) s'ajoute avec les modules.
 */
async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "quercy-proprete" },
    update: { logoUrl: "/brand/quercy-mark.png", industry: "cleaning", size: "11-50" },
    create: {
      name: "Quercy Propreté",
      slug: "quercy-proprete",
      logoUrl: "/brand/quercy-mark.png",
      industry: "cleaning",
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
      update: { permissions: role.permissions, systemKey: role.systemKey },
      create: { organizationId: org.id, ...role },
    });
  }
  const roles = await prisma.role.findMany({
    where: { organizationId: org.id, systemKey: { not: null } },
  });
  const roleId = (key: SystemRoleKey) => roles.find((r) => r.systemKey === key)!.id;

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users: Record<string, string> = {};
  for (const person of PEOPLE) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: { name: person.name, deletedAt: null },
      create: {
        email: person.email,
        emailVerified: true,
        name: person.name,
        preferences: { theme: "system", density: "normal" },
      },
    });
    users[person.email] = user.id;
    const credential = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (!credential) {
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: passwordHash,
        },
      });
    }
    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
      update: { roleId: roleId(person.role), deletedAt: null },
      create: { organizationId: org.id, userId: user.id, roleId: roleId(person.role) },
    });
  }

  for (const teamName of ["Commercial", "Terrain"]) {
    const members = PEOPLE.filter((p) => p.team === teamName).map((p) => users[p.email]!);
    const team = await prisma.team.upsert({
      where: { organizationId_name: { organizationId: org.id, name: teamName } },
      update: {},
      create: { organizationId: org.id, name: teamName, leadUserId: members[0] ?? null },
    });
    await prisma.teamMember.createMany({
      data: members.map((userId) => ({ teamId: team.id, userId })),
      skipDuplicates: true,
    });
  }

  console.info(`Espace de démonstration prêt : ${org.name}`);
  console.info(
    `Comptes : ${PEOPLE.map((p) => p.email).join(", ")} — mot de passe : ${DEMO_PASSWORD}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
