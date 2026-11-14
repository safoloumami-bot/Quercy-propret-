import { randomBytes } from "node:crypto";

import { type SystemRoleKey } from "@quercy/core";
import { MODULE_KEYS } from "@quercy/core";
import { type Prisma, SYSTEM_ROLE_SEEDS, prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { expect } from "vitest";

import type { Context } from "../trpc/init";
import { createCaller } from "../trpc/root";

/** Outils des tests d'intégration : espaces, membres et appelants tRPC isolés par exécution. */
export function testFixtures(prefix: string) {
  const run = randomBytes(4).toString("hex");
  const orgs: string[] = [];
  const users: string[] = [];

  async function user(label: string) {
    const u = await prisma.user.create({
      data: {
        email: `${prefix}-${label}-${run}@test.quercy.app`,
        name: `${label} ${run}`,
        emailVerified: true,
      },
    });
    users.push(u.id);
    return u;
  }

  async function org(label: string, data: Partial<Prisma.OrganizationUncheckedCreateInput> = {}) {
    const o = await prisma.organization.create({
      data: {
        name: `${prefix} ${label} ${run}`,
        slug: `${prefix}-${label}-${run}`,
        modules: [...MODULE_KEYS],
        plan: "BUSINESS",
        subscriptionStatus: "ACTIVE",
        ...data,
      },
    });
    orgs.push(o.id);
    await prisma.role.createMany({
      data: SYSTEM_ROLE_SEEDS.map((r) => ({ ...r, organizationId: o.id })),
    });
    return o;
  }

  async function member(organizationId: string, userId: string, role: SystemRoleKey) {
    const r = await prisma.role.findFirstOrThrow({ where: { organizationId, systemKey: role } });
    return prisma.membership.create({ data: { organizationId, userId, roleId: r.id } });
  }

  async function caller(u: { id: string; name: string; email: string }, organizationId: string) {
    const session = await prisma.session.create({
      data: {
        userId: u.id,
        token: randomBytes(24).toString("hex"),
        expiresAt: new Date(Date.now() + 3_600_000),
        activeOrganizationId: organizationId,
      },
    });
    return createCaller({
      headers: new Headers(),
      session: { session, user: u },
    } as unknown as Context);
  }

  async function cleanup() {
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.notification.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.membership.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  }

  return { run, user, org, member, caller, cleanup };
}

export async function expectCode(promise: Promise<unknown>, code: TRPCError["code"]) {
  await expect(promise).rejects.toSatisfy(
    (e: unknown) => e instanceof TRPCError && e.code === code,
  );
}
