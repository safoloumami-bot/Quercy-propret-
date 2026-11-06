import "server-only";

import { randomBytes } from "node:crypto";

import { PLANS, memberLimitError } from "@quercy/core";
import { prisma } from "@quercy/db";

import { loadBillingState } from "../billing/state";

type BillingOrg = Parameters<typeof loadBillingState>[0] & { slug: string };

/** Ajout refusé (limite de l'offre, rôle manquant) : message présenté tel quel. */
export class AgentMemberError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const normalizeName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Membre de l'espace correspondant à un intervenant : un membre existant du même nom (hors
 * `exclude`), sinon un compte créé pour l'occasion, avec le rôle Intervenant et sans mot de
 * passe : il sert au planning et à l'application terrain, pas à ouvrir le logiciel.
 */
export async function ensureAgentMember(
  org: BillingOrg,
  name: string,
  options: { code?: string; exclude?: ReadonlySet<string> } = {},
): Promise<{ userId: string; created: boolean }> {
  const members = await prisma.membership.findMany({
    where: { organizationId: org.id, deletedAt: null },
    include: { user: { select: { id: true, name: true } } },
  });
  const match = members.find(
    (m) => !options.exclude?.has(m.user.id) && normalizeName(m.user.name) === normalizeName(name),
  );
  if (match) return { userId: match.user.id, created: false };

  const billing = await loadBillingState(org);
  const limit = memberLimitError(
    billing.limits,
    billing.memberCount + 1,
    PLANS[billing.effectivePlan].name,
  );
  if (limit) throw new AgentMemberError(limit, 403);
  const role = await prisma.role.findFirst({
    where: { organizationId: org.id, systemKey: { in: ["worker", "member"] }, deletedAt: null },
    orderBy: { systemKey: "desc" },
  });
  if (!role) throw new AgentMemberError("Rôle « Intervenant » introuvable dans l'espace.", 500);
  const local = (options.code ?? normalizeName(name).replace(/[^a-z0-9]+/g, "."))
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 30);
  const user = await prisma.user.create({
    data: {
      name: name.trim().slice(0, 60),
      email: `${local || "agent"}.${randomBytes(4).toString("hex")}@terrain.${org.slug}.invalid`,
      memberships: { create: { organizationId: org.id, roleId: role.id } },
    },
  });
  return { userId: user.id, created: true };
}
