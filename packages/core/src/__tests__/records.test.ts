import { describe, expect, it } from "vitest";

import {
  ENTITIES,
  type FilterGroup,
  buildOrderBy,
  buildWhere,
  countRules,
  customFieldToDef,
  entityFields,
  parseRecordInput,
  recordTitle,
} from "../records";

const company = ENTITIES.company.fields;
const now = new Date("2026-10-01T12:00:00Z");

describe("buildWhere", () => {
  it("ignore un filtre vide", () => {
    expect(buildWhere(company, { combinator: "and", rules: [] })).toEqual({});
  });

  it("recherche textuelle insensible à la casse", () => {
    expect(
      buildWhere(company, {
        combinator: "and",
        rules: [{ field: "name", operator: "contains", value: "dup" }],
      }),
    ).toEqual({
      name: { contains: "dup", mode: "insensitive" },
    });
  });

  it("combine ET/OU avec un groupe imbriqué", () => {
    const filter: FilterGroup = {
      combinator: "or",
      rules: [
        { field: "type", operator: "in", value: ["customer"] },
        {
          combinator: "and",
          rules: [
            { field: "city", operator: "equals", value: "Cahors" },
            { field: "annualRevenue", operator: "gte", value: "50000" },
          ],
        },
      ],
    };
    expect(buildWhere(company, filter)).toEqual({
      OR: [
        { type: { in: ["customer"] } },
        {
          AND: [
            { city: { equals: "Cahors", mode: "insensitive" } },
            { annualRevenue: { gte: 50000 } },
          ],
        },
      ],
    });
    expect(countRules(filter)).toBe(3);
  });

  it("refuse les champs inconnus et les opérateurs inadaptés (liste blanche)", () => {
    const where = buildWhere(company, {
      combinator: "and",
      rules: [
        { field: "organizationId", operator: "equals", value: "autre-espace" },
        { field: "name", operator: "gt", value: 3 },
        { field: "deletedAt", operator: "is_not_empty" },
      ],
    });
    expect(where).toEqual({});
  });

  it("dates relatives et plages", () => {
    const where = buildWhere(
      company,
      { combinator: "and", rules: [{ field: "createdAt", operator: "in_last_days", value: 7 }] },
      now,
    );
    expect(where).toEqual({
      createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000), lte: now },
    });
  });

  it("étiquettes et valeurs vides", () => {
    expect(
      buildWhere(company, {
        combinator: "and",
        rules: [{ field: "tags", operator: "has_any", value: ["vip"] }],
      }),
    ).toEqual({
      tags: { hasSome: ["vip"] },
    });
    expect(
      buildWhere(company, { combinator: "and", rules: [{ field: "tags", operator: "is_empty" }] }),
    ).toEqual({
      tags: { isEmpty: true },
    });
  });

  it("champs personnalisés via le chemin JSON", () => {
    const fields = entityFields(ENTITIES.company, [
      { key: "secteur_naf", label: "NAF", type: "TEXT", options: {} },
    ]);
    expect(
      buildWhere(fields, {
        combinator: "and",
        rules: [{ field: "cf.secteur_naf", operator: "equals", value: "81.21Z" }],
      }),
    ).toEqual({
      customFields: { path: ["secteur_naf"], equals: "81.21Z" },
    });
  });
});

describe("buildOrderBy", () => {
  it("n'ajoute pas « nulls » aux colonnes obligatoires", () => {
    expect(buildOrderBy(company, [], ENTITIES.company.defaultSort)).toEqual([
      { name: "asc" },
      { id: "asc" },
    ]);
  });

  it("garde les champs triables et ajoute un départage stable", () => {
    expect(
      buildOrderBy(
        company,
        [
          { field: "annualRevenue", direction: "desc" },
          { field: "tags", direction: "asc" },
        ],
        ENTITIES.company.defaultSort,
      ),
    ).toEqual([{ annualRevenue: { sort: "desc", nulls: "last" } }, { id: "asc" }]);
  });
});

describe("parseRecordInput", () => {
  const contact = ENTITIES.contact.fields;

  it("valide, normalise et range les champs personnalisés à part", () => {
    const fields = [
      ...contact,
      customFieldToDef({ key: "anniversaire", label: "Anniversaire", type: "DATE", options: {} }),
    ];
    const result = parseRecordInput(
      fields,
      {
        lastName: " Dupont ",
        email: "Marie@Dupont.FR",
        score: "72,5",
        status: "Client",
        tags: "vip, cahors",
        "cf.anniversaire": "14/02/1990",
        organizationId: "pirate",
      },
      "create",
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.data).toEqual({
      lastName: "Dupont",
      email: "marie@dupont.fr",
      score: 72.5,
      status: "customer",
      tags: ["vip", "cahors"],
    });
    expect(result.value.customFields).toEqual({ anniversaire: "1990-02-14" });
  });

  it("signale les erreurs par champ, avec un message lisible", () => {
    const result = parseRecordInput(
      contact,
      { lastName: "", email: "pas-un-email", status: "Inconnu" },
      "create",
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.lastName).toBe("Nom est obligatoire.");
    expect(result.errors.email).toContain("adresse invalide");
    expect(result.errors.status).toContain("inconnue");
  });

  it("en modification, seuls les champs fournis sont touchés", () => {
    const result = parseRecordInput(contact, { jobTitle: "Gérante" }, "update");
    expect(result).toEqual({
      success: true,
      value: { data: { jobTitle: "Gérante" }, customFields: {} },
    });
  });

  it("complète les URL sans protocole", () => {
    const result = parseRecordInput(company, { website: "dupont.fr" }, "update");
    expect(result.success && result.value.data.website).toBe("https://dupont.fr");
  });
});

describe("recordTitle", () => {
  it("compose le nom d'un contact", () => {
    expect(recordTitle("contact", { firstName: "Marie", lastName: "Dupont" })).toBe("Marie Dupont");
    expect(recordTitle("company", { name: "Dupont SARL" })).toBe("Dupont SARL");
  });
});
