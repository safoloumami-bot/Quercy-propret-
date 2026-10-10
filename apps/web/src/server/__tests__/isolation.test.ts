import { randomBytes } from "node:crypto";

import { SYSTEM_ROLE_KEYS, type SystemRoleKey } from "@quercy/core";
import { SYSTEM_ROLE_SEEDS as ROLE_SEEDS, forTenant, prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Context } from "../trpc/init";
import { createCaller } from "../trpc/root";

/**
 * Tests d'isolation multi-entreprises, sur la vraie base PostgreSQL.
 * Deux espaces A et B : aucune procédure appelée depuis A ne doit lire ni modifier B,
 * même en connaissant les identifiants de B.
 */

const run = randomBytes(4).toString("hex");
const created = { orgs: [] as string[], users: [] as string[] };

async function makeUser(label: string) {
  const user = await prisma.user.create({
    data: {
      email: `${label}-${run}@test.quercy.app`,
      name: `${label} ${run}`,
      emailVerified: true,
    },
  });
  created.users.push(user.id);
  return user;
}

async function makeOrg(label: string, owner: { id: string }) {
  const org = await prisma.organization.create({
    data: { name: `Espace ${label} ${run}`, slug: `test-${label}-${run}`, modules: ["crm"] },
  });
  created.orgs.push(org.id);
  await prisma.role.createMany({ data: ROLE_SEEDS.map((r) => ({ ...r, organizationId: org.id })) });
  const roles = await prisma.role.findMany({ where: { organizationId: org.id } });
  const roleId = (key: SystemRoleKey) => roles.find((r) => r.systemKey === key)!.id;
  await prisma.membership.create({
    data: { organizationId: org.id, userId: owner.id, roleId: roleId("owner") },
  });
  return { org, roleId };
}

async function callerFor(
  user: { id: string; name: string; email: string },
  organizationId: string,
) {
  const token = randomBytes(24).toString("hex");
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3_600_000),
      activeOrganizationId: organizationId,
    },
  });
  const context = {
    headers: new Headers(),
    session: {
      session,
      user: {
        ...user,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  } as unknown as Context;
  return createCaller(context);
}

async function expectCode(promise: Promise<unknown>, code: TRPCError["code"]) {
  await expect(promise).rejects.toSatisfy(
    (e: unknown) => e instanceof TRPCError && e.code === code,
  );
}

let ownerA: Awaited<ReturnType<typeof makeUser>>;
let ownerB: Awaited<ReturnType<typeof makeUser>>;
let viewerA: Awaited<ReturnType<typeof makeUser>>;
let A: Awaited<ReturnType<typeof makeOrg>>;
let B: Awaited<ReturnType<typeof makeOrg>>;
let bMembershipId: string;
let bTeamId: string;
let bCustomRoleId: string;
let bInvitationId: string;

beforeAll(async () => {
  ownerA = await makeUser("owner-a");
  ownerB = await makeUser("owner-b");
  viewerA = await makeUser("viewer-a");
  A = await makeOrg("a", ownerA);
  B = await makeOrg("b", ownerB);
  await prisma.membership.create({
    data: { organizationId: A.org.id, userId: viewerA.id, roleId: A.roleId("viewer") },
  });

  const memberB = await makeUser("member-b");
  bMembershipId = (
    await prisma.membership.create({
      data: { organizationId: B.org.id, userId: memberB.id, roleId: B.roleId("member") },
    })
  ).id;
  bTeamId = (await prisma.team.create({ data: { organizationId: B.org.id, name: "Équipe B" } })).id;
  bCustomRoleId = (
    await prisma.role.create({
      data: { organizationId: B.org.id, name: "Rôle B", permissions: {} },
    })
  ).id;
  bInvitationId = (
    await prisma.invitation.create({
      data: {
        organizationId: B.org.id,
        email: `invite-b-${run}@test.quercy.app`,
        roleId: B.roleId("member"),
        invitedById: ownerB.id,
        token: randomBytes(16).toString("hex"),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    })
  ).id;
  await prisma.auditLog.create({
    data: {
      organizationId: B.org.id,
      actorId: ownerB.id,
      action: "team.create",
      entityType: "team",
      entityId: bTeamId,
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: created.orgs } } });
  await prisma.invitation.deleteMany({ where: { organizationId: { in: created.orgs } } });
  await prisma.membership.deleteMany({ where: { organizationId: { in: created.orgs } } });
  await prisma.organization.deleteMany({ where: { id: { in: created.orgs } } });
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  await prisma.$disconnect();
});

describe("isolation entre espaces (API)", () => {
  it("les listes ne renvoient que les données de l'espace actif", async () => {
    const api = await callerFor(ownerA, A.org.id);
    const members = await api.members.list();
    expect(members.map((m) => m.user.id).sort()).toEqual([ownerA.id, viewerA.id].sort());
    expect((await api.teams.list()).map((t) => t.id)).not.toContain(bTeamId);
    expect((await api.roles.list()).map((r) => r.id)).not.toContain(bCustomRoleId);
    expect((await api.invitations.list()).map((i) => i.id)).not.toContain(bInvitationId);
    const audit = await api.audit.list({ limit: 100 });
    expect(audit.items.every((i) => i.entityId !== bTeamId)).toBe(true);
  });

  it("un identifiant d'un autre espace est introuvable, en lecture comme en écriture", async () => {
    const api = await callerFor(ownerA, A.org.id);
    await expectCode(
      api.members.updateRole({ membershipId: bMembershipId, roleId: A.roleId("viewer") }),
      "NOT_FOUND",
    );
    await expectCode(api.members.remove({ membershipId: bMembershipId }), "NOT_FOUND");
    await expectCode(
      api.teams.update({ id: bTeamId, name: "Piratée", memberIds: [] }),
      "NOT_FOUND",
    );
    await expectCode(api.teams.delete({ id: bTeamId }), "NOT_FOUND");
    await expectCode(
      api.roles.update({ id: bCustomRoleId, name: "Piraté", permissions: {} }),
      "NOT_FOUND",
    );
    await expectCode(api.roles.delete({ id: bCustomRoleId }), "NOT_FOUND");
    await expectCode(api.invitations.revoke({ id: bInvitationId }), "NOT_FOUND");
    await expectCode(
      api.invitations.create({ emails: [`x-${run}@test.quercy.app`], roleId: B.roleId("member") }),
      "NOT_FOUND",
    );

    // Rien n'a bougé dans B.
    const team = await prisma.team.findUniqueOrThrow({ where: { id: bTeamId } });
    expect(team.name).toBe("Équipe B");
    expect(team.deletedAt).toBeNull();
    const membership = await prisma.membership.findUniqueOrThrow({ where: { id: bMembershipId } });
    expect(membership.roleId).toBe(B.roleId("member"));
    expect(membership.deletedAt).toBeNull();
  });

  it("on ne peut pas ajouter à une équipe une personne d'un autre espace", async () => {
    const api = await callerFor(ownerA, A.org.id);
    await expectCode(
      api.teams.create({ name: `Mixte ${run}`, memberIds: [ownerB.id] }),
      "BAD_REQUEST",
    );
  });

  it("on ne peut pas basculer vers un espace dont on n'est pas membre", async () => {
    const api = await callerFor(ownerA, A.org.id);
    await expectCode(api.workspace.switch({ organizationId: B.org.id }), "FORBIDDEN");
  });

  it("un espace actif invalide en session retombe sur un espace dont on est membre", async () => {
    const api = await callerFor(ownerA, B.org.id);
    const current = await api.workspace.current();
    expect(current.id).toBe(A.org.id);
  });
});

describe("isolation au niveau de la base (forTenant)", () => {
  it("filtre les lectures et force l'espace à la création", async () => {
    const db = forTenant(A.org.id);
    const roles = await db.role.findMany();
    expect(roles.every((r) => r.organizationId === A.org.id)).toBe(true);
    expect(await db.team.findUnique({ where: { id: bTeamId } })).toBeNull();

    const team = await db.team.create({
      data: { organizationId: B.org.id, name: `Forcée ${run}` },
    });
    expect(team.organizationId).toBe(A.org.id);
    await prisma.team.delete({ where: { id: team.id } });
  });

  it("les mises à jour groupées n'atteignent pas l'autre espace", async () => {
    const db = forTenant(A.org.id);
    const result = await db.team.updateMany({ where: { id: bTeamId }, data: { name: "Piratée" } });
    expect(result.count).toBe(0);
  });

  it("masque les éléments en corbeille, sauf demande explicite", async () => {
    const db = forTenant(A.org.id);
    const team = await db.team.create({
      data: { organizationId: A.org.id, name: `Corbeille ${run}`, deletedAt: new Date() },
    });
    expect(await db.team.findUnique({ where: { id: team.id } })).toBeNull();
    expect(
      await db.team.findFirst({ where: { id: team.id, deletedAt: { not: null } } }),
    ).not.toBeNull();
    await prisma.team.delete({ where: { id: team.id } });
  });
});

describe("permissions côté serveur", () => {
  it("un lecteur ne peut ni inviter, ni retirer, ni changer de rôle", async () => {
    const api = await callerFor(viewerA, A.org.id);
    await expectCode(
      api.invitations.create({ emails: [`y-${run}@test.quercy.app`], roleId: A.roleId("member") }),
      "FORBIDDEN",
    );
    const owner = (await api.members.list()).find((m) => m.user.id === ownerA.id)!;
    await expectCode(api.members.remove({ membershipId: owner.id }), "FORBIDDEN");
    await expectCode(
      api.members.updateRole({ membershipId: owner.id, roleId: A.roleId("viewer") }),
      "FORBIDDEN",
    );
    await expectCode(api.audit.list({ limit: 10 }), "FORBIDDEN");
    await expectCode(api.workspace.updateAccent({ color: "#123456" }), "FORBIDDEN");
  });

  it("le dernier propriétaire ne peut ni partir ni être rétrogradé", async () => {
    const api = await callerFor(ownerA, A.org.id);
    await expectCode(api.workspace.leave(), "PRECONDITION_FAILED");
  });

  it("les rôles prédéfinis sont en lecture seule", async () => {
    const api = await callerFor(ownerA, A.org.id);
    await expectCode(
      api.roles.update({ id: A.roleId("member"), name: "Autre", permissions: {} }),
      "BAD_REQUEST",
    );
    await expectCode(api.roles.delete({ id: A.roleId("member") }), "BAD_REQUEST");
  });

  it("le rôle Propriétaire ne s'attribue pas par invitation", async () => {
    const api = await callerFor(ownerA, A.org.id);
    await expectCode(
      api.invitations.create({ emails: [`z-${run}@test.quercy.app`], roleId: A.roleId("owner") }),
      "BAD_REQUEST",
    );
  });

  it("les sept rôles prédéfinis existent dans chaque espace", () => {
    expect(SYSTEM_ROLE_KEYS.length).toBe(7);
  });
});
