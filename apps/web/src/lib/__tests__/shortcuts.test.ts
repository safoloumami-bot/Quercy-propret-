import { describe, expect, it } from "vitest";

import { activeNavItem, breadcrumbFor } from "../navigation";
import { GO_SEQUENCE_TIMEOUT_MS, resolveShortcut } from "../shortcuts";

const idle = { pendingGoAt: null };
const key = (k: string, extra: Partial<{ mod: boolean; alt: boolean; typing: boolean }> = {}) => ({
  key: k,
  mod: false,
  alt: false,
  typing: false,
  ...extra,
});

describe("resolveShortcut", () => {
  it("Ctrl+K ouvre la palette, même pendant la saisie", () => {
    expect(resolveShortcut(key("k", { mod: true, typing: true }), idle, 0).action).toEqual({
      type: "palette",
    });
  });

  it("ignore les touches simples pendant la saisie", () => {
    expect(resolveShortcut(key("/", { typing: true }), idle, 0).action).toBeNull();
    expect(resolveShortcut(key("?", { typing: true }), idle, 0).action).toBeNull();
  });

  it("gère la séquence G puis R", () => {
    const first = resolveShortcut(key("g"), idle, 1000);
    expect(first.action).toBeNull();
    const second = resolveShortcut(key("r"), first.state, 1500);
    expect(second.action).toEqual({ type: "navigate", href: "/reglages/apparence" });
  });

  it("abandonne la séquence après le délai", () => {
    const first = resolveShortcut(key("g"), idle, 0);
    const late = resolveShortcut(key("h"), first.state, GO_SEQUENCE_TIMEOUT_MS + 1);
    expect(late.action).toBeNull();
  });

  it("? ouvre l'aide et Ctrl+B replie la barre latérale", () => {
    expect(resolveShortcut(key("?"), idle, 0).action).toEqual({ type: "help" });
    expect(resolveShortcut(key("b", { mod: true }), idle, 0).action).toEqual({ type: "sidebar" });
  });
});

describe("navigation", () => {
  it("trouve l'élément actif par préfixe", () => {
    expect(activeNavItem("/")?.id).toBe("home");
    expect(activeNavItem("/reglages/apparence")?.id).toBe("appearance");
    expect(activeNavItem("/inconnu")).toBeUndefined();
  });

  it("construit le fil d'Ariane avec la section", () => {
    expect(breadcrumbFor("/reglages/apparence")).toEqual([
      { label: "Réglages" },
      { label: "Apparence", href: "/reglages/apparence" },
    ]);
  });
});
