import { describe, expect, it } from "vitest";

import { MODULE_KEYS } from "../modules";
import { PRODUCT_UNITS, VAT_RATES } from "../records/entities";
import { INDUSTRIES, createOrganizationSchema } from "../schemas";
import {
  DEFAULT_TRADE_PRESETS,
  GENERAL_TRADE_KEY,
  TRADES,
  TRADE_KEYS,
  type StoredTradePreset,
  detectActivity,
  mergeTradePresets,
  tradeDefinition,
  tradePresetInputSchema,
} from "../trades";

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
    // Les métiers ajoutés par l'équipe ont leur propre clé : le serveur vérifie qu'elle existe.
    expect(createOrganizationSchema.parse({ ...base, trade: "auto-ecole" }).trade).toBe(
      "auto-ecole",
    );
    expect(createOrganizationSchema.safeParse({ ...base, trade: "Auto École" }).success).toBe(
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

describe("Préréglages modifiables par l'équipe", () => {
  const row = (over: Partial<StoredTradePreset>): StoredTradePreset => ({
    key: "auto-ecole",
    label: "Auto-école",
    hint: "Permis B, code",
    industry: "services",
    keywords: ["auto-ecole", "moniteur", "permis de conduire"],
    modules: ["crm", "sales", "calendar", "inconnu"],
    catalog: [
      { name: "Heure de conduite", unit: "hour", unitPrice: 55, vatRate: "20", category: "Leçons" },
    ],
    decennial: false,
    renovationVat: false,
    assistant: "Auto-école.",
    active: true,
    position: 95,
    ...over,
  });

  it("les préréglages d'origine sont tous valides et la base neutre est en dernier", () => {
    for (const p of DEFAULT_TRADE_PRESETS) {
      expect(tradePresetInputSchema.safeParse(p).success, p.key).toBe(true);
    }
    expect(DEFAULT_TRADE_PRESETS.at(-1)?.key).toBe(GENERAL_TRADE_KEY);
  });

  it("un métier ajouté est reconnu, un module inconnu est ignoré", () => {
    const presets = mergeTradePresets([row({})]);
    const added = presets.find((p) => p.key === "auto-ecole");
    expect(added?.modules).toEqual(["crm", "sales", "calendar"]);
    expect(added?.builtin).toBe(false);
    expect(detectActivity("Moniteur d'auto-école à Cahors", presets)).toEqual({
      trade: "auto-ecole",
      industry: "services",
    });
  });

  it("une modification remplace le préréglage d'origine, un métier désactivé n'est plus reconnu", () => {
    const presets = mergeTradePresets([
      row({
        key: "plumbing",
        label: "Plombier-chauffagiste",
        keywords: ["plombier"],
        active: false,
      }),
    ]);
    const plumbing = presets.find((p) => p.key === "plumbing");
    expect(plumbing?.label).toBe("Plombier-chauffagiste");
    expect(plumbing?.builtin && plumbing.customized).toBe(true);
    expect(presets.filter((p) => p.key === "plumbing")).toHaveLength(1);
    expect(detectActivity("plombier", presets).trade).toBeNull();
  });

  it("la base neutre n'est jamais proposée par la reconnaissance et reste active", () => {
    const presets = mergeTradePresets([
      row({ key: GENERAL_TRADE_KEY, keywords: ["boutique"], active: false }),
    ]);
    expect(detectActivity("boutique de vêtements", presets).trade).toBeNull();
    expect(presets.find((p) => p.key === GENERAL_TRADE_KEY)?.active).toBe(true);
  });

  it("un catalogue enregistré invalide est ignoré plutôt que de casser l'application", () => {
    const presets = mergeTradePresets([row({ catalog: [{ name: 3 }] })]);
    expect(presets.find((p) => p.key === "auto-ecole")?.catalog).toEqual([]);
  });
});
