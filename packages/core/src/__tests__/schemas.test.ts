import { describe, expect, it } from "vitest";

import { auditActionLabel, diffChanges } from "../audit";
import { createOrganizationSchema, emailSchema, inviteSchema, slugify } from "../schemas";

describe("diffChanges", () => {
  it("ne garde que les champs modifiés", () => {
    expect(diffChanges({ name: "A", size: "1" }, { name: "B", size: "1" })).toEqual({
      name: { before: "A", after: "B" },
    });
  });

  it("compare les objets et les dates par valeur", () => {
    const d = new Date("2026-01-01");
    expect(diffChanges({ at: d, p: { a: 1 } }, { at: new Date(d), p: { a: 1 } })).toEqual({});
  });

  it("restreint aux champs demandés", () => {
    expect(diffChanges({ a: 1, b: 1 }, { a: 2, b: 2 }, ["a"])).toEqual({
      a: { before: 1, after: 2 },
    });
  });
});

describe("schémas de saisie", () => {
  it("normalise les emails", () => {
    expect(emailSchema.parse("  Marie@Dupont.FR ")).toBe("marie@dupont.fr");
    expect(emailSchema.safeParse("pas-un-email").success).toBe(false);
  });

  it("refuse une invitation vide", () => {
    expect(inviteSchema.safeParse({ emails: [], roleId: "r" }).success).toBe(false);
  });

  it("interdit d'inviter un propriétaire à la création de l'espace", () => {
    const base = {
      name: "Dupont",
      industry: "services",
      size: "2-10",
      modules: ["crm"],
      accentColor: "#0F6E5E",
    };
    expect(createOrganizationSchema.safeParse(base).success).toBe(true);
    expect(
      createOrganizationSchema.safeParse({
        ...base,
        invitations: [{ email: "a@b.fr", systemRole: "owner" }],
      }).success,
    ).toBe(false);
  });

  it("crée des slugs sûrs", () => {
    expect(slugify("Dupont & Fils — Cahors")).toBe("dupont-fils-cahors");
    expect(slugify("!!!")).toBe("espace");
  });

  it("donne un libellé lisible aux actions d'audit", () => {
    expect(auditActionLabel("member.remove")).toBe("a retiré un membre");
    expect(auditActionLabel("inconnue")).toBe("inconnue");
  });
});
