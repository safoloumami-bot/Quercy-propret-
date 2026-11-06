import { randomBytes } from "node:crypto";

import { type Prisma, SYSTEM_ROLE_SEEDS, prisma } from "@quercy/db";
import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Context } from "../trpc/init";

// Configuration Stripe de test (aucun appel réseau : seuls les webhooks sont exercés).
process.env.STRIPE_SECRET_KEY = "sk_test_quercy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_quercy_test";
process.env.STRIPE_PRICE_PRO_MONTH = "price_pro_month";
process.env.STRIPE_PRICE_PRO_YEAR = "price_pro_year";
process.env.STRIPE_PRICE_BUSINESS_MONTH = "price_business_month";
process.env.STRIPE_PRICE_BUSINESS_YEAR = "price_business_year";

const { verifyWebhook } = await import("../billing/stripe");
const { receiveStripeEvent, runStripeEvent } = await import("../billing/webhook");
const { createCaller } = await import("../trpc/root");

const run = randomBytes(4).toString("hex");
const orgs: string[] = [];
const users: string[] = [];
const events: string[] = [];

async function makeOrg(label: string, data: Partial<Prisma.OrganizationUncheckedCreateInput> = {}) {
  const owner = await prisma.user.create({
    data: { email: `${label}-${run}@test.quercy.app`, name: `Owner ${label}`, emailVerified: true },
  });
  users.push(owner.id);
  const org = await prisma.organization.create({
    data: {
      name: `Billing ${label} ${run}`,
      slug: `billing-${label}-${run}`,
      modules: ["crm"],
      ...data,
    },
  });
  orgs.push(org.id);
  await prisma.role.createMany({
    data: SYSTEM_ROLE_SEEDS.map((r) => ({ ...r, organizationId: org.id })),
  });
  const ownerRole = await prisma.role.findFirstOrThrow({
    where: { organizationId: org.id, systemKey: "owner" },
  });
  await prisma.membership.create({
    data: { organizationId: org.id, userId: owner.id, roleId: ownerRole.id },
  });
  return { org, owner };
}

async function callerFor(
  user: { id: string; name: string; email: string },
  organizationId: string,
) {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: randomBytes(24).toString("hex"),
      expiresAt: new Date(Date.now() + 3_600_000),
      activeOrganizationId: organizationId,
    },
  });
  return createCaller({ headers: new Headers(), session: { session, user } } as unknown as Context);
}

function event(type: string, object: object): Stripe.Event {
  const id = `evt_${run}_${randomBytes(6).toString("hex")}`;
  events.push(id);
  return {
    id,
    object: "event",
    type,
    data: { object },
    created: Math.floor(Date.now() / 1000),
  } as unknown as Stripe.Event;
}

function subscription(organizationId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `sub_${run}_${organizationId.slice(-6)}`,
    object: "subscription",
    customer: `cus_${run}_${organizationId.slice(-6)}`,
    status: "active",
    cancel_at_period_end: false,
    metadata: { organizationId },
    items: {
      data: [
        {
          id: "si_1",
          quantity: 3,
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86_400,
          price: { id: "price_pro_month" },
        },
      ],
    },
    ...overrides,
  };
}

async function expectCode(promise: Promise<unknown>, code: TRPCError["code"]) {
  await expect(promise).rejects.toSatisfy(
    (e: unknown) => e instanceof TRPCError && e.code === code,
  );
}

afterAll(async () => {
  await prisma.stripeEvent.deleteMany({ where: { id: { in: events } } });
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgs } } });
  await prisma.invitation.deleteMany({ where: { organizationId: { in: orgs } } });
  await prisma.membership.deleteMany({ where: { organizationId: { in: orgs } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});

describe("webhooks Stripe", () => {
  let orgId: string;
  beforeAll(async () => {
    orgId = (
      await makeOrg("sub", { plan: "BUSINESS", trialEndsAt: new Date(Date.now() + 86_400_000) })
    ).org.id;
  });

  it("vérifie la signature et refuse un corps altéré", () => {
    const payload = JSON.stringify(event("invoice.paid", { id: "in_1", customer: null }));
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_quercy_test",
    });
    expect(verifyWebhook(payload, header).type).toBe("invoice.paid");
    expect(() => verifyWebhook(payload.replace("invoice.paid", "invoice.void"), header)).toThrow();
  });

  it("un abonnement créé fixe l'offre, les sièges et termine l'essai", async () => {
    expect(
      await receiveStripeEvent(event("customer.subscription.created", subscription(orgId))),
    ).toBe("processed");
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org).toMatchObject({
      plan: "PRO",
      billingInterval: "MONTH",
      seats: 3,
      subscriptionStatus: "ACTIVE",
      trialEndsAt: null,
    });
    expect(org.stripeCustomerId).toBe(`cus_${run}_${orgId.slice(-6)}`);
  });

  it("une même livraison n'est traitée qu'une fois (idempotence)", async () => {
    const e = event(
      "customer.subscription.updated",
      subscription(orgId, {
        items: {
          data: [
            {
              id: "si_1",
              quantity: 5,
              current_period_end: 1_900_000_000,
              price: { id: "price_business_year" },
            },
          ],
        },
      }),
    );
    expect(await receiveStripeEvent(e)).toBe("processed");
    expect(await receiveStripeEvent(e)).toBe("duplicate");
    const stored = await prisma.stripeEvent.findUniqueOrThrow({ where: { id: e.id } });
    expect(stored.attempts).toBe(1);
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org).toMatchObject({ plan: "BUSINESS", billingInterval: "YEAR", seats: 5 });
  });

  it("paiement refusé puis réussi : délai de grâce ouvert puis refermé", async () => {
    const customer = `cus_${run}_${orgId.slice(-6)}`;
    await receiveStripeEvent(
      event("customer.subscription.updated", subscription(orgId, { status: "past_due" })),
    );
    await receiveStripeEvent(event("invoice.payment_failed", { id: "in_2", customer }));
    let org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.subscriptionStatus).toBe("PAST_DUE");
    expect(org.pastDueSince).not.toBeNull();

    await receiveStripeEvent(event("invoice.paid", { id: "in_3", customer }));
    org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.pastDueSince).toBeNull();
    expect(org.subscriptionStatus).toBe("ACTIVE");
  });

  it("un abonnement supprimé ramène l'espace à l'offre Gratuite", async () => {
    await receiveStripeEvent(
      event("customer.subscription.deleted", subscription(orgId, { status: "canceled" })),
    );
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org).toMatchObject({
      plan: "FREE",
      subscriptionStatus: "CANCELED",
      stripeSubscriptionId: null,
      seats: 0,
    });
    expect(org.canceledAt).not.toBeNull();
  });

  it("un événement en échec est conservé puis rejouable", async () => {
    const missingOrg = `org_absent_${run}`;
    const e = event("checkout.session.completed", {
      id: "cs_1",
      mode: "subscription",
      client_reference_id: missingOrg,
      customer: `cus_late_${run}`,
      subscription: `sub_late_${run}`,
    });
    expect(await receiveStripeEvent(e)).toBe("failed");
    expect((await prisma.stripeEvent.findUniqueOrThrow({ where: { id: e.id } })).status).toBe(
      "FAILED",
    );

    await prisma.organization.create({
      data: { id: missingOrg, name: "Tardif", slug: `tardif-${run}` },
    });
    orgs.push(missingOrg);
    expect(await runStripeEvent(e.id)).toBe("processed");
    const stored = await prisma.stripeEvent.findUniqueOrThrow({ where: { id: e.id } });
    expect(stored).toMatchObject({ status: "PROCESSED", attempts: 2, error: null });
  });

  it("les événements non gérés sont ignorés proprement", async () => {
    expect(await receiveStripeEvent(event("customer.created", { id: "cus_x" }))).toBe("ignored");
  });
});

describe("limites de l'offre", () => {
  it("l'offre Gratuite refuse une invitation au-delà d'un utilisateur", async () => {
    const { org, owner } = await makeOrg("free", { plan: "FREE" });
    const api = await callerFor(owner, org.id);
    const role = await prisma.role.findFirstOrThrow({
      where: { organizationId: org.id, systemKey: "member" },
    });
    const error = await api.invitations
      .create({ emails: [`x-${run}@test.quercy.app`], roleId: role.id })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe("PRECONDITION_FAILED");
    expect((error as TRPCError).message).toContain("limitée à 1 utilisateur");
  });

  it("l'offre Pro refuse un septième module", async () => {
    const { org, owner } = await makeOrg("pro", { plan: "PRO", subscriptionStatus: "ACTIVE" });
    const api = await callerFor(owner, org.id);
    await expectCode(
      api.workspace.updateModules({
        modules: ["crm", "sales", "purchases", "inventory", "projects", "calendar", "support"],
      }),
      "PRECONDITION_FAILED",
    );
    expect(
      (await api.workspace.updateModules({ modules: ["crm", "sales", "projects"] })).modules,
    ).toHaveLength(3);
  });

  it("essai terminé au-delà des limites : lecture seule, sauf pour régulariser", async () => {
    const { org, owner } = await makeOrg("expired", {
      plan: "BUSINESS",
      trialEndsAt: new Date(Date.now() - 86_400_000),
      modules: ["crm", "sales", "projects"],
    });
    const api = await callerFor(owner, org.id);
    await expectCode(api.teams.create({ name: "Bloquée", memberIds: [] }), "FORBIDDEN");
    await expectCode(api.workspace.updateAccent({ color: "#123456" }), "FORBIDDEN");
    // Réduire les modules reste possible et fait sortir de la lecture seule.
    await api.workspace.updateModules({ modules: ["crm", "sales"] });
    await expect(
      api.teams.create({ name: `Débloquée ${run}`, memberIds: [] }),
    ).resolves.toHaveProperty("id");
    // Les lectures restent disponibles.
    const overview = await api.billing.overview();
    expect(overview.state.effectivePlan).toBe("FREE");
    expect(overview.state.readOnly).toBeNull();
  });

  it("seul le propriétaire gère l'abonnement", async () => {
    const { org } = await makeOrg("perm", { plan: "PRO", subscriptionStatus: "ACTIVE" });
    const admin = await prisma.user.create({
      data: { email: `admin-${run}@test.quercy.app`, name: "Admin", emailVerified: true },
    });
    users.push(admin.id);
    const adminRole = await prisma.role.findFirstOrThrow({
      where: { organizationId: org.id, systemKey: "admin" },
    });
    await prisma.membership.create({
      data: { organizationId: org.id, userId: admin.id, roleId: adminRole.id },
    });
    const api = await callerFor(admin, org.id);
    await expect(api.billing.overview()).resolves.toMatchObject({ canManage: false });
    await expectCode(api.billing.checkout({ plan: "BUSINESS", interval: "YEAR" }), "FORBIDDEN");
    await expectCode(api.billing.portal(), "FORBIDDEN");
  });
});
