import { describe, expect, it } from "vitest";

import { MODULE_KEYS } from "../modules";
import { PRODUCT_UNITS, VAT_RATES } from "../records/entities";
import { INDUSTRIES, createOrganizationSchema } from "../schemas";
import { TRADES, TRADE_KEYS, detectActivity, tradeDefinition } from "../trades";

const units = PRODUCT_UNITS.map((u) => u.value);
const rates = VAT_RATES.map((r) => r.value);

describe("Corps de métier", () => {
  it.each(TRADE_KEYS)("%s : préréglage cohérent", (key) => {
    const t = TRADES[key];
    expect(t.key).toBe(key);
    expect(INDUSTRIES.some((i) => i.value === t.industry)).toBe(true);
    expect(t.modules.length).toBeGreaterThan(0);
    // L'offre Pro autorise 6 modules : le préréglage doit y tenir.
    expect(t.modules.length).toBeLessThanOrEqual(6);
    for (const m of t.modules) expect(MODULE_KEYS).toContain(m);
    expect(t.catalog.length).toBeGreaterThanOrEqual(5);
    const names = t.catalog.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const item of t.catalog) {
      expect(units).toContain(item.unit);
      expect(rates).toContain(item.vatRate);
      expect(item.unitPrice).toBeGreaterThan(0);
    }
    // Pas de taux réduit de travaux pour un métier qui n'en relève pas.
    if (!t.renovationVat) expect(t.catalog.every((c) => c.vatRate === "20")).toBe(true);
    expect(t.assistant.length).toBeGreaterThan(80);
  });

  it("le nettoyage active le module Nettoyage et interventions", () => {
    expect(TRADES.cleaning.modules).toContain("cleaning");
  });

  it("les chaudières à combustible fossile restent à 20 %", () => {
    const chaudiere = TRADES.plumbing.catalog.find((c) => c.name.startsWith("Chaudière gaz"));
    expect(chaudiere?.vatRate).toBe("20");
  });

  it("résout un métier inconnu en null", () => {
    expect(tradeDefinition("plumbing")?.label).toBe("Plomberie et chauffage");
    expect(tradeDefinition("inconnu")).toBeNull();
    expect(tradeDefinition(null)).toBeNull();
  });

  it("le métier est facultatif à la création d'un espace", () => {
    const base = {
      name: "Durand",
      industry: "construction",
      size: "2-10",
      modules: ["crm"],
      accentColor: "#0F6E5E",
    };
    expect(createOrganizationSchema.parse(base).trade).toBeNull();
    expect(createOrganizationSchema.parse({ ...base, trade: "plumbing" }).trade).toBe("plumbing");
    expect(createOrganizationSchema.safeParse({ ...base, trade: "astronaute" }).success).toBe(
      false,
    );
  });
});

describe("Reconnaissance du métier", () => {
  it.each([
    ["Plombier chauffagiste à Toulouse, dépannages et salles de bain", "plumbing"],
    ["Électricien, mise aux normes et bornes de recharge", "electrical"],
    ["Entreprise de nettoyage de bureaux et de parties communes", "cleaning"],
    ["Société de ménage chez les particuliers", "cleaning"],
    ["Démoussage et nettoyage de toiture, zinguerie", "roofing"],
    ["Maçon, gros œuvre et extensions de maisons", "masonry"],
    ["Peintre en bâtiment et plaquiste", "painting"],
    ["Carreleur à Lyon", "painting"],
    ["Menuisier : cuisines et dressings sur mesure", "carpentry"],
    ["Paysagiste, entretien de jardins et élagage", "landscaping"],
    ["Multiservice, petits travaux et serrurerie", "multiservice"],
    ["Pompe à chaleur et climatisation", "plumbing"],
  ])("%s → %s", (text, trade) => {
    expect(detectActivity(text).trade).toBe(trade);
  });

  it("donne le secteur du métier reconnu", () => {
    expect(detectActivity("plombier").industry).toBe("construction");
    expect(detectActivity("nettoyage").industry).toBe("cleaning");
  });

  it("devine le secteur quand aucun métier ne correspond", () => {
    expect(detectActivity("Boutique de vêtements en ligne")).toEqual({
      trade: null,
      industry: "retail",
    });
    expect(detectActivity("Cabinet de conseil en stratégie")).toEqual({
      trade: null,
      industry: "agency",
    });
    expect(detectActivity("Je fais des choses")).toEqual({ trade: null, industry: null });
  });

  it("ignore les mots inclus dans d'autres mots", () => {
    // « pac » ne doit pas être reconnu dans « capacité » ni « toit » dans « toiletteur »
    expect(detectActivity("capacité d'accueil").trade).toBeNull();
    expect(detectActivity("toiletteur pour chiens").trade).toBeNull();
  });
});
