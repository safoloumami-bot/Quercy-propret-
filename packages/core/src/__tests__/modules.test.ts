import { describe, expect, it } from "vitest";

import { accentPalette, contrastRatio, readableForeground, relativeLuminance } from "../color";
import { MODULES, MODULE_KEYS, activeModules, moduleBySlug } from "../modules";
import { organizationPreferencesSchema } from "../preferences";

describe("catalogue des modules", () => {
  it("chaque clé a une définition cohérente et un slug unique", () => {
    const slugs = new Set<string>();
    for (const key of MODULE_KEYS) {
      expect(MODULES[key].key).toBe(key);
      expect(slugs.has(MODULES[key].slug)).toBe(false);
      slugs.add(MODULES[key].slug);
    }
  });

  it("activeModules respecte l'ordre canonique", () => {
    expect(activeModules(["projects", "crm"]).map((m) => m.key)).toEqual(["crm", "projects"]);
  });

  it("moduleBySlug retrouve un module", () => {
    expect(moduleBySlug("ventes")?.key).toBe("sales");
    expect(moduleBySlug("inconnu")).toBeUndefined();
  });
});

describe("préférences et couleurs", () => {
  it("applique les valeurs par défaut françaises", () => {
    const prefs = organizationPreferencesSchema.parse({});
    expect(prefs).toMatchObject({ locale: "fr", currency: "EUR", timezone: "Europe/Paris" });
  });

  it("refuse une couleur invalide", () => {
    expect(organizationPreferencesSchema.safeParse({ accentColor: "vert" }).success).toBe(false);
  });

  it("choisit un texte lisible sur l'accent (contraste AA)", () => {
    for (const bg of ["#0F6E5E", "#2FD3B4", "#FFD400", "#1E1B4B"]) {
      expect(contrastRatio(bg, readableForeground(bg))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("accentPalette", () => {
  it("conserve l'accent par défaut en clair et l'éclaircit en sombre", () => {
    const p = accentPalette("#0F6E5E");
    expect(p.light.primary).toBe("#0F6E5E");
    expect(p.light.foreground).toBe("#FFFFFF");
    expect(relativeLuminance(p.dark.primary)).toBeGreaterThan(relativeLuminance("#0F6E5E"));
  });

  it("assure un contraste AA entre l'accent et son texte, dans les deux thèmes", () => {
    for (const hex of ["#0F6E5E", "#6D28D9", "#F59E0B", "#E11D48", "#FAFAFA", "#111111"]) {
      const p = accentPalette(hex);
      expect(contrastRatio(p.light.primary, p.light.foreground)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.dark.primary, p.dark.foreground)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
