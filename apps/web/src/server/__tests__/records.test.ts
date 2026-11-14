import { prisma } from "@quercy/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("rec");
type Api = Awaited<ReturnType<typeof fx.caller>>;

let owner: Awaited<ReturnType<typeof fx.user>>;
let seller: Awaited<ReturnType<typeof fx.user>>;
let orgId: string;
let otherOrgId: string;
let ownerApi: Api;
let sellerApi: Api;
let outsiderApi: Api;

beforeAll(async () => {
  owner = await fx.user("owner");
  seller = await fx.user("seller");
  const outsider = await fx.user("outsider");
  const org = await fx.org("a");
  const other = await fx.org("b");
  orgId = org.id;
  otherOrgId = other.id;
  await fx.member(orgId, owner.id, "owner");
  await fx.member(orgId, seller.id, "member");
  await fx.member(otherOrgId, outsider.id, "owner");
  ownerApi = await fx.caller(owner, orgId);
  sellerApi = await fx.caller(seller, orgId);
  outsiderApi = await fx.caller(outsider, otherOrgId);
});

afterAll(async () => {
  await fx.cleanup();
  await prisma.$disconnect();
});

describe("création, liste, filtres", () => {
  it("crée, valide et trace une entreprise", async () => {
    const created = await ownerApi.records.create({
      entity: "company",
      values: {
        name: "Dupont & Fils",
        type: "customer",
        city: "Cahors",
        annualRevenue: "120 000",
        website: "dupont.fr",
      },
    });
    expect(created).toMatchObject({
      name: "Dupont & Fils",
      annualRevenue: 120000,
      website: "https://dupont.fr",
      ownerId: owner.id,
    });
    const audit = await prisma.auditLog.findFirst({
      where: { organizationId: orgId, entityId: created.id, action: "record.create" },
    });
    expect(audit).not.toBeNull();
  });

  it("refuse une saisie invalide avec un message par champ", async () => {
    await expectCode(
      ownerApi.records.create({ entity: "company", values: { name: "", email: "pas-un-email" } }),
      "BAD_REQUEST",
    );
  });

  it("filtre, trie et recherche", async () => {
    await ownerApi.records.create({
      entity: "company",
      values: { name: "Atelier Garonne", type: "prospect", city: "Figeac", annualRevenue: 50000 },
    });
    await ownerApi.records.create({
      entity: "company",
      values: { name: "Zeta Conseil", type: "customer", city: "Cahors", annualRevenue: 900000 },
    });
    const customers = await ownerApi.records.list({
      entity: "company",
      filter: {
        combinator: "and",
        rules: [{ field: "type", operator: "in", value: ["customer"] }],
      },
      sort: [{ field: "annualRevenue", direction: "desc" }],
    });
    expect(customers.rows.map((r) => r.name)).toEqual(["Zeta Conseil", "Dupont & Fils"]);
    const search = await ownerApi.records.list({ entity: "company", search: "garonne" });
    expect(search.rows.map((r) => r.name)).toEqual(["Atelier Garonne"]);
  });

  it("regroupe avec nombre et sous-totaux", async () => {
    const groups = await ownerApi.records.groups({
      entity: "company",
      groupBy: "type",
      filter: { combinator: "and", rules: [] },
    });
    const customer = groups.find((g) => g.value === "customer");
    expect(customer).toMatchObject({ label: "Client", count: 2 });
    expect(customer?.aggregates.annualRevenue).toBe(1_020_000);
  });

  it("champs personnalisés : définition, saisie, filtre", async () => {
    await ownerApi.customFields.create({
      entity: "company",
      label: "Code client",
      type: "TEXT",
      choices: [],
      required: false,
    });
    const company = await ownerApi.records.create({
      entity: "company",
      values: { name: "Perso", "cf.code_client": "C-042" },
    });
    expect(company["cf.code_client"]).toBe("C-042");
    const found = await ownerApi.records.list({
      entity: "company",
      filter: {
        combinator: "and",
        rules: [{ field: "cf.code_client", operator: "equals", value: "C-042" }],
      },
    });
    expect(found.rows.map((r) => r.id)).toEqual([company.id]);
  });
});

describe("modification, historique, corbeille", () => {
  it("garde l'ancienne et la nouvelle valeur, et notifie le nouveau responsable", async () => {
    const c = await ownerApi.records.create({
      entity: "company",
      values: { name: "Historique", city: "Gourdon" },
    });
    await ownerApi.records.update({
      entity: "company",
      id: c.id,
      values: { city: "Souillac", ownerId: seller.id },
    });
    const history = await ownerApi.audit.forRecord({ entity: "company", id: c.id });
    const change = history.find((h) => h.action === "record.update");
    expect(change?.changes?.city).toEqual({ before: "Gourdon", after: "Souillac" });
    const notification = await prisma.notification.findFirst({
      where: { userId: seller.id, type: "record.assigned" },
    });
    expect(notification?.title).toContain("Historique");
  });

  it("met à la corbeille puis restaure", async () => {
    const c = await ownerApi.records.create({ entity: "company", values: { name: "Corbeille" } });
    await ownerApi.records.delete({ entity: "company", ids: [c.id] });
    await expectCode(ownerApi.records.get({ entity: "company", id: c.id }), "NOT_FOUND");
    expect((await ownerApi.records.trash({ entity: "company" })).map((t) => t.id)).toContain(c.id);
    await ownerApi.records.restore({ entity: "company", ids: [c.id] });
    await expect(ownerApi.records.get({ entity: "company", id: c.id })).resolves.toHaveProperty(
      "row.id",
      c.id,
    );
  });
});

describe("périmètre « les siens » (rôle Membre)", () => {
  it("un membre voit tout mais ne modifie que ses fiches", async () => {
    const theirs = await ownerApi.records.create({
      entity: "company",
      values: { name: "Au propriétaire" },
    });
    const mine = await sellerApi.records.create({
      entity: "company",
      values: { name: "Au commercial", ownerId: owner.id },
    });
    // Le rôle Membre crée « pour soi » : le responsable forcé est lui-même.
    expect(mine.ownerId).toBe(seller.id);
    await expect(
      sellerApi.records.get({ entity: "company", id: theirs.id }),
    ).resolves.toMatchObject({ canEdit: false });
    await expectCode(
      sellerApi.records.update({ entity: "company", id: theirs.id, values: { city: "Pirate" } }),
      "NOT_FOUND",
    );
    await expect(
      sellerApi.records.update({ entity: "company", id: mine.id, values: { city: "Cahors" } }),
    ).resolves.toHaveProperty("city", "Cahors");
    const bulk = await sellerApi.records.bulkUpdate({
      entity: "company",
      ids: [theirs.id, mine.id],
      values: { type: "partner" },
    });
    expect(bulk.count).toBe(1);
  });
});

describe("import", () => {
  it("valide ligne par ligne, résout les références et n'importe que les lignes valides", async () => {
    await ownerApi.records.create({ entity: "company", values: { name: "Boulangerie Marty" } });
    const rows: Record<string, string>[] = [
      {
        lastName: "Marty",
        firstName: "Paul",
        companyId: "boulangerie marty",
        ownerId: owner.email,
        status: "Client",
      },
      { lastName: "", firstName: "Sans nom" },
      { lastName: "Inconnue", companyId: "Entreprise fantôme" },
    ];
    const dry = await ownerApi.records.import({ entity: "contact", rows, dryRun: true });
    expect(dry.valid).toBe(1);
    expect(dry.errors.map((e) => e.row)).toEqual([2, 3]);
    expect(dry.imported).toBe(0);
    const done = await ownerApi.records.import({ entity: "contact", rows, dryRun: false });
    expect(done.imported).toBe(1);
    const list = await ownerApi.records.list({ entity: "contact", search: "Paul Marty" });
    expect(list.rows[0]?.labels).toMatchObject({ companyId: "Boulangerie Marty" });
    expect(list.rows[0]?.status).toBe("customer");
  });
});

describe("collaboration", () => {
  it("un commentaire avec @mention notifie la personne mentionnée", async () => {
    const c = await ownerApi.records.create({ entity: "company", values: { name: "Mentions" } });
    await ownerApi.comments.create({
      entity: "company",
      id: c.id,
      body: `Peux-tu rappeler ? @[${seller.name}](${seller.id})`,
    });
    const comments = await sellerApi.comments.list({ entity: "company", id: c.id });
    expect(comments).toHaveLength(1);
    const unread = await sellerApi.notifications.list();
    expect(unread.some((n) => n.type === "mention" && n.url?.includes(c.id))).toBe(true);
  });

  it("vues enregistrées : personnelles, partagées, modifiables par l'auteur seul", async () => {
    const config = {
      columns: [{ key: "name", visible: true }],
      sort: [],
      filter: { combinator: "and" as const, rules: [] },
      groupBy: null,
      density: "compact" as const,
    };
    const { id } = await ownerApi.views.create({
      entity: "company",
      name: "Clients",
      shared: true,
      config,
    });
    const personal = await ownerApi.views.create({
      entity: "company",
      name: "Perso",
      shared: false,
      config,
    });
    const seen = await sellerApi.views.list({ entity: "company" });
    expect(seen.map((v) => v.id)).toContain(id);
    expect(seen.map((v) => v.id)).not.toContain(personal.id);
    await expectCode(sellerApi.views.update({ id, name: "Piratée" }), "NOT_FOUND");
  });

  it("recherche globale limitée à l'espace", async () => {
    const results = await ownerApi.search.global({ q: "Dupont" });
    expect(results.some((r) => r.title === "Dupont & Fils")).toBe(true);
    expect(await outsiderApi.search.global({ q: "Dupont" })).toEqual([]);
  });
});

describe("isolation", () => {
  it("un autre espace ne voit ni ne modifie les fiches", async () => {
    const c = await ownerApi.records.create({ entity: "company", values: { name: "Secret" } });
    await expectCode(outsiderApi.records.get({ entity: "company", id: c.id }), "NOT_FOUND");
    await expectCode(
      outsiderApi.records.update({ entity: "company", id: c.id, values: { name: "Volé" } }),
      "NOT_FOUND",
    );
    expect((await outsiderApi.records.delete({ entity: "company", ids: [c.id] })).count).toBe(0);
    await expectCode(outsiderApi.comments.list({ entity: "company", id: c.id }), "NOT_FOUND");
    await expectCode(outsiderApi.files.list({ entity: "company", id: c.id }), "NOT_FOUND");
    await expectCode(outsiderApi.audit.forRecord({ entity: "company", id: c.id }), "NOT_FOUND");
    const list = await outsiderApi.records.list({ entity: "company" });
    expect(list.rows.some((r) => r.id === c.id)).toBe(false);
  });

  it("un module désactivé est inaccessible", async () => {
    await prisma.organization.update({ where: { id: otherOrgId }, data: { modules: ["sales"] } });
    await expectCode(outsiderApi.records.list({ entity: "company" }), "FORBIDDEN");
  });
});
