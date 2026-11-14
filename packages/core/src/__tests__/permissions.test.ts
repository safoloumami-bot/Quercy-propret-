import { describe, expect, it } from "vitest";

import { MODULE_KEYS } from "../modules";
import { ACTIONS, RESOURCES, SYSTEM_ROLES, can, mergePermissions } from "../permissions";

describe("rôles prédéfinis", () => {
  it("le propriétaire a tous les droits sur toutes les ressources", () => {
    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        expect(can(SYSTEM_ROLES.owner, resource, action)).toBe(true);
      }
    }
  });

  it("seul le propriétaire administre la facturation", () => {
    expect(can(SYSTEM_ROLES.admin, "billing", "admin")).toBe(false);
    expect(can(SYSTEM_ROLES.admin, "billing", "view")).toBe(true);
    expect(can(SYSTEM_ROLES.owner, "billing", "admin")).toBe(true);
  });

  it("le lecteur ne peut que consulter", () => {
    for (const m of MODULE_KEYS) {
      expect(can(SYSTEM_ROLES.viewer, m, "view")).toBe(true);
      expect(can(SYSTEM_ROLES.viewer, m, "create")).toBe(false);
      expect(can(SYSTEM_ROLES.viewer, m, "delete")).toBe(false);
    }
  });

  it("le comptable externe ne voit que les modules financiers", () => {
    expect(can(SYSTEM_ROLES.accountant, "sales", "export")).toBe(true);
    expect(can(SYSTEM_ROLES.accountant, "treasury", "view")).toBe(true);
    expect(can(SYSTEM_ROLES.accountant, "crm", "view")).toBe(false);
    expect(can(SYSTEM_ROLES.accountant, "sales", "update")).toBe(false);
  });
});

describe("portées own / team", () => {
  const me = { userId: "u1", teamIds: ["t1"] };

  it("un membre modifie ses propres éléments, pas ceux des autres", () => {
    expect(can(SYSTEM_ROLES.member, "crm", "update", { ...me, ownerId: "u1" })).toBe(true);
    expect(can(SYSTEM_ROLES.member, "crm", "update", { ...me, ownerId: "u2" })).toBe(false);
  });

  it("un manager modifie les éléments de son équipe uniquement", () => {
    const own = { ...me, ownerId: "u2", ownerTeamIds: ["t1"] };
    const other = { ...me, ownerId: "u3", ownerTeamIds: ["t9"] };
    expect(can(SYSTEM_ROLES.manager, "projects", "update", own)).toBe(true);
    expect(can(SYSTEM_ROLES.manager, "projects", "update", other)).toBe(false);
  });
});

describe("mergePermissions", () => {
  it("garde la portée la plus large", () => {
    const merged = mergePermissions(
      { crm: { view: "own", update: "own" } },
      { crm: { view: "all" }, sales: { view: "team" } },
    );
    expect(merged).toEqual({ crm: { view: "all", update: "own" }, sales: { view: "team" } });
  });
});
