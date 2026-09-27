import { DEFAULT_ACCENT, MODULE_KEYS, type SystemRoleKey } from "@quercy/core";

import { prisma } from "../src/client";
import { hashPassword } from "../src/password";
import { SYSTEM_ROLE_SEEDS } from "../src/roles";
import { seedBusiness } from "./seed-business";
import { seedCrm } from "./seed-crm";

/** Mot de passe commun des comptes de démonstration (documenté dans le README). */
export const DEMO_PASSWORD = "Quercy-demo-2026";

const PEOPLE: { email: string; name: string; role: SystemRoleKey; team?: string }[] = [
  { email: "demo@quercy.app", name: "Camille Delmas", role: "owner" },
  { email: "julien.marty@quercy.app", name: "Julien Marty", role: "manager", team: "Commercial" },
  { email: "sophie.lacombe@quercy.app", name: "Sophie Lacombe", role: "member", team: "Terrain" },
  { email: "nadia.benali@quercy.app", name: "Nadia Benali", role: "accountant" },
  { email: "lucas.roux@quercy.app", name: "Lucas Roux", role: "viewer", team: "Terrain" },
];

const DAY = 86_400_000;

/** L'espace de démonstration est abonné à Business (annuel) : aucune restriction d'offre. */
const DEMO_SUBSCRIPTION = {
  plan: "BUSINESS" as const,
  subscriptionStatus: "ACTIVE" as const,
  billingInterval: "YEAR" as const,
  seats: PEOPLE.length,
  currentPeriodEnd: new Date(Date.now() + 240 * DAY),
  subscribedAt: new Date(Date.now() - 125 * DAY),
  trialEndsAt: null,
};

/** Autres espaces clients, pour que l'administration de la plateforme soit parlante. */
const CLIENTS = [
  {
    slug: "atelier-garonne",
    name: "Atelier Garonne",
    owner: "Inès Garonne",
    industry: "construction",
    data: { plan: "PRO", subscriptionStatus: "ACTIVE", billingInterval: "MONTH", seats: 4 },
    modules: ["crm", "sales", "projects"],
    ageDays: 210,
  },
  {
    slug: "cabinet-lot-associes",
    name: "Cabinet Lot & Associés",
    owner: "Thomas Lot",
    industry: "agency",
    data: { plan: "BUSINESS", subscriptionStatus: "ACTIVE", billingInterval: "YEAR", seats: 7 },
    modules: [...MODULE_KEYS],
    ageDays: 340,
  },
  {
    slug: "studio-cahors",
    name: "Studio Cahors",
    owner: "Emma Vidal",
    industry: "agency",
    data: {
      plan: "PRO",
      subscriptionStatus: "PAST_DUE",
      billingInterval: "MONTH",
      seats: 2,
      pastDueSince: new Date(Date.now() - 2 * DAY),
    },
    modules: ["crm", "sales"],
    ageDays: 95,
  },
  {
    slug: "boulangerie-marty",
    name: "Boulangerie Marty",
    owner: "Paul Marty",
    industry: "retail",
    data: {
      plan: "BUSINESS",
      subscriptionStatus: "NONE",
      trialEndsAt: new Date(Date.now() + 3 * DAY),
    },
    modules: ["crm", "sales", "inventory"],
    ageDays: 11,
  },
  {
    slug: "menuiserie-bastide",
    name: "Menuiserie Bastide",
    owner: "Julie Bastide",
    industry: "construction",
    data: {
      plan: "FREE",
      subscriptionStatus: "CANCELED",
      canceledAt: new Date(Date.now() - 12 * DAY),
    },
    modules: ["crm"],
    ageDays: 160,
  },
] as const;

/**
 * Données de démonstration — socle : un espace, ses rôles, cinq comptes (un par rôle
 * principal) et deux équipes. Idempotent : peut être relancé sans doublon.
 * Le jeu complet sur 12 mois (clients, factures, projets…) s'ajoute avec les modules.
 */
async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "quercy-proprete" },
    update: {
      logoUrl: "/brand/quercy-mark.png",
      industry: "cleaning",
      size: "11-50",
      ...DEMO_SUBSCRIPTION,
    },
    create: {
      name: "Quercy Propreté",
      slug: "quercy-proprete",
      logoUrl: "/brand/quercy-mark.png",
      industry: "cleaning",
      size: "11-50",
      ...DEMO_SUBSCRIPTION,
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

  const sellers = PEOPLE.filter((p) => p.role !== "viewer" && p.role !== "accountant").map(
    (p) => users[p.email]!,
  );
  await seedCrm(prisma, org.id, sellers);
  await seedBusiness(prisma, org.id, sellers);

  // Super-admin de la plateforme (équipe Quercy), sans espace client.
  const admin = await prisma.user.upsert({
    where: { email: "admin@quercy.app" },
    update: { role: "admin" },
    create: {
      email: "admin@quercy.app",
      name: "Équipe Quercy",
      emailVerified: true,
      role: "admin",
    },
  });
  if (
    !(await prisma.account.findFirst({ where: { userId: admin.id, providerId: "credential" } }))
  ) {
    await prisma.account.create({
      data: {
        userId: admin.id,
        accountId: admin.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  for (const client of CLIENTS) {
    const createdAt = new Date(Date.now() - client.ageDays * DAY);
    const clientOrg = await prisma.organization.upsert({
      where: { slug: client.slug },
      update: { ...client.data },
      create: {
        slug: client.slug,
        name: client.name,
        industry: client.industry,
        size: "2-10",
        modules: [...client.modules],
        onboardedAt: createdAt,
        createdAt,
        ...(client.data.subscriptionStatus === "ACTIVE" ||
        client.data.subscriptionStatus === "PAST_DUE"
          ? { subscribedAt: createdAt, currentPeriodEnd: new Date(Date.now() + 20 * DAY) }
          : {}),
        ...client.data,
      },
    });
    for (const role of SYSTEM_ROLE_SEEDS) {
      await prisma.role.upsert({
        where: { organizationId_name: { organizationId: clientOrg.id, name: role.name } },
        update: {},
        create: { organizationId: clientOrg.id, ...role },
      });
    }
    const ownerRole = await prisma.role.findFirstOrThrow({
      where: { organizationId: clientOrg.id, systemKey: "owner" },
    });
    const email = `${client.slug}@clients.quercy.app`;
    const clientOwner = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: client.owner, emailVerified: true },
    });
    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: clientOrg.id, userId: clientOwner.id } },
      update: {},
      create: { organizationId: clientOrg.id, userId: clientOwner.id, roleId: ownerRole.id },
    });
  }

  console.info(`Espace de démonstration prêt : ${org.name}`);
  console.info(`Super-admin : admin@quercy.app — mot de passe : ${DEMO_PASSWORD}`);
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
