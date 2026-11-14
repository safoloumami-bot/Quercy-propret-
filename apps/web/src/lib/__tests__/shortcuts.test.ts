import { describe, expect, it } from "vitest";

import { SYSTEM_ROLES } from "@quercy/core";

import {
  SETTINGS_SECTIONS,
  activeNavItem,
  breadcrumbFor,
  filterSections,
  isSettingsPath,
} from "../navigation";
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

  it("gère la séquence G puis M", () => {
    const first = resolveShortcut(key("g"), idle, 1000);
    expect(first.action).toBeNull();
    expect(resolveShortcut(key("m"), first.state, 1500).action).toEqual({
      type: "navigate",
      href: "/reglages/membres",
    });
  });

  it("abandonne la séquence après le délai", () => {
    const first = resolveShortcut(key("g"), idle, 0);
    expect(resolveShortcut(key("h"), first.state, GO_SEQUENCE_TIMEOUT_MS + 1).action).toBeNull();
  });

  it("? ouvre l'aide et Ctrl+B replie la barre latérale", () => {
    expect(resolveShortcut(key("?"), idle, 0).action).toEqual({ type: "help" });
    expect(resolveShortcut(key("b", { mod: true }), idle, 0).action).toEqual({ type: "sidebar" });
    expect(resolveShortcut(key("j", { mod: true, typing: true }), idle, 0).action).toEqual({
      type: "assistant",
    });
  });
});

describe("navigation", () => {
  it("trouve l'écran actif par préfixe", () => {
    expect(activeNavItem("/")?.id).toBe("home");
    expect(activeNavItem("/reglages/apparence")?.id).toBe("appearance");
    expect(activeNavItem("/inconnu")).toBeUndefined();
    expect(isSettingsPath("/reglages/membres")).toBe(true);
    expect(isSettingsPath("/")).toBe(false);
  });

  it("construit le fil d'Ariane des réglages", () => {
    expect(breadcrumbFor("/reglages/apparence")).toEqual([
      { label: "Réglages", href: "/reglages/profil" },
      { label: "Apparence", href: "/reglages/apparence" },
    ]);
  });

  it("masque les écrans non autorisés", () => {
    const ids = (role: keyof typeof SYSTEM_ROLES) =>
      filterSections(SETTINGS_SECTIONS, SYSTEM_ROLES[role]).flatMap((s) =>
        s.items.map((i) => i.id),
      );
    expect(ids("owner")).toContain("roles");
    expect(ids("owner")).toContain("audit");
    expect(ids("viewer")).not.toContain("roles");
    expect(ids("viewer")).not.toContain("audit");
    expect(ids("viewer")).toContain("members");
    expect(ids("accountant")).not.toContain("members");
    expect(ids("accountant")).toContain("audit");
  });
});

describe("safeNext", async () => {
  const { safeNext } = await import("../safe-redirect");
  it("accepte les chemins internes et refuse le reste", () => {
    expect(safeNext("/reglages/membres?x=1")).toBe("/reglages/membres?x=1");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(null, "/bienvenue")).toBe("/bienvenue");
  });
});
