import { describe, expect, it } from "vitest";

import {
  type BillingSnapshot,
  billingState,
  formatCents,
  memberLimitError,
  moduleLimitError,
  monthlyRecurringRevenue,
  PLANS,
  pricePerSeatPerMonth,
} from "../billing";

const now = new Date("2026-10-01T12:00:00Z");
const day = 86_400_000;
const base: BillingSnapshot = {
  plan: "BUSINESS",
  subscriptionStatus: "NONE",
  trialEndsAt: new Date(now.getTime() + 5 * day),
  pastDueSince: null,
  memberCount: 3,
  moduleCount: 8,
};

describe("prix", () => {
  it("applique 20 % de remise à l'annuel", () => {
    expect(pricePerSeatPerMonth("PRO", "MONTH")).toBe(1500);
    expect(pricePerSeatPerMonth("PRO", "YEAR")).toBe(1200);
    expect(pricePerSeatPerMonth("ENTERPRISE", "MONTH")).toBeNull();
  });

  it("calcule le MRR par siège", () => {
    expect(monthlyRecurringRevenue("BUSINESS", "YEAR", 4)).toBe(2320 * 4);
    expect(monthlyRecurringRevenue("FREE", null, 1)).toBe(0);
  });

  it("formate en euros", () => {
    expect(formatCents(1500).replace(/\s/g, " ")).toBe("15 €");
    expect(formatCents(2320).replace(/\s/g, " ")).toBe("23,20 €");
  });
});

describe("billingState", () => {
  it("pendant l'essai : Business, jours restants, aucune restriction", () => {
    const s = billingState(base, now);
    expect(s.effectivePlan).toBe("BUSINESS");
    expect(s.trialing).toBe(true);
    expect(s.trialDaysLeft).toBe(5);
    expect(s.readOnly).toBeNull();
  });

  it("essai terminé au-delà des limites du Gratuit : lecture seule", () => {
    const s = billingState({ ...base, trialEndsAt: new Date(now.getTime() - day) }, now);
    expect(s.effectivePlan).toBe("FREE");
    expect(s.overLimits).toEqual({ members: true, modules: true });
    expect(s.readOnly).toBe("trial_ended_over_limits");
  });

  it("essai terminé dans les limites du Gratuit : l'espace continue en Gratuit", () => {
    const s = billingState(
      { ...base, trialEndsAt: new Date(now.getTime() - day), memberCount: 1, moduleCount: 2 },
      now,
    );
    expect(s.effectivePlan).toBe("FREE");
    expect(s.readOnly).toBeNull();
  });

  it("abonnement actif : l'offre souscrite s'applique même après la date d'essai", () => {
    const s = billingState(
      { ...base, plan: "PRO", subscriptionStatus: "ACTIVE", trialEndsAt: new Date(0) },
      now,
    );
    expect(s.effectivePlan).toBe("PRO");
    expect(s.readOnly).toBeNull();
    expect(s.trialing).toBe(false);
  });

  it("paiement refusé : délai de grâce, puis lecture seule", () => {
    const recent = billingState(
      {
        ...base,
        plan: "PRO",
        subscriptionStatus: "PAST_DUE",
        pastDueSince: new Date(now.getTime() - 2 * day),
      },
      now,
    );
    expect(recent.gracePeriod).toEqual({ daysLeft: 5 });
    expect(recent.readOnly).toBeNull();
    const late = billingState(
      {
        ...base,
        plan: "PRO",
        subscriptionStatus: "PAST_DUE",
        pastDueSince: new Date(now.getTime() - 8 * day),
      },
      now,
    );
    expect(late.gracePeriod).toBeNull();
    expect(late.readOnly).toBe("payment_overdue");
  });

  it("impayé : lecture seule immédiate", () => {
    expect(billingState({ ...base, plan: "PRO", subscriptionStatus: "UNPAID" }, now).readOnly).toBe(
      "unpaid",
    );
  });

  it("l'offre Entreprise n'expire pas avec l'essai", () => {
    const s = billingState({ ...base, plan: "ENTERPRISE", trialEndsAt: null }, now);
    expect(s.effectivePlan).toBe("ENTERPRISE");
    expect(s.readOnly).toBeNull();
  });
});

describe("messages de limite", () => {
  it("explique la limite et l'offre à choisir", () => {
    expect(memberLimitError(PLANS.FREE.limits, 2, "Gratuit")).toContain("limitée à 1 utilisateur");
    expect(memberLimitError(PLANS.PRO.limits, 200, "Pro")).toBeNull();
    expect(moduleLimitError(PLANS.PRO.limits, 7, "Pro")).toContain("6 modules");
  });
});
