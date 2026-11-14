import { prisma } from "@quercy/db";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { GET as getOne } from "@/app/api/v1/[entity]/[id]/route";
import { GET as list, POST as create } from "@/app/api/v1/[entity]/route";

import { openApiDocument } from "../api/openapi";
import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("integrations");
type Api = Awaited<ReturnType<typeof fx.caller>>;

let orgId: string;
let ownerId: string;
let ownerApi: Api;
let memberApi: Api;

beforeAll(async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const owner = await fx.user("owner");
  const member = await fx.user("member");
  ownerId = owner.id;
  const org = await fx.org("a");
  orgId = org.id;
  await fx.member(orgId, owner.id, "owner");
  await fx.member(orgId, member.id, "member");
  ownerApi = await fx.caller(owner, orgId);
  memberApi = await fx.caller(member, orgId);
});

afterAll(async () => {
  await fx.cleanup();
  await prisma.$disconnect();
});

const empty = { combinator: "and" as const, rules: [] };

describe("automatisations", () => {
  it("exécute les actions quand la condition est remplie, en chaîne", async () => {
    await ownerApi.automations.save({
      name: "Ticket créé : urgent",
      entity: "ticket",
      trigger: "created",
      conditions: empty,
      actions: [{ type: "set_field", field: "priority", value: "urgent" }],
      active: true,
    });
    await ownerApi.automations.save({
      name: "Ticket urgent résolu : tâche de suivi",
      entity: "ticket",
      trigger: "updated",
      conditions: {
        combinator: "and",
        rules: [
          { field: "priority", operator: "in", value: ["urgent"] },
          { field: "status", operator: "in", value: ["resolved"] },
        ],
      },
      actions: [
        { type: "create_task", title: "Rappeler le client : {{titre}}", dueInDays: 2 },
        { type: "notify", to: "owner", message: "« {{titre}} » est résolu." },
      ],
      active: true,
    });
    const ticket = await ownerApi.records.create({
      entity: "ticket",
      values: { subject: "Fuite" },
    });
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).priority).toBe(
      "urgent",
    );
    expect(await prisma.task.count({ where: { organizationId: orgId } })).toBe(0);

    await ownerApi.records.update({
      entity: "ticket",
      id: ticket.id,
      values: { status: "resolved" },
    });
    const task = await prisma.task.findFirstOrThrow({ where: { organizationId: orgId } });
    expect(task).toMatchObject({ title: "Rappeler le client : Fuite", ownerId });
    expect(
      await prisma.notification.count({ where: { organizationId: orgId, type: "automation" } }),
    ).toBe(1);
    const runs = await ownerApi.automations.list();
    expect(runs.every((a) => a.runCount === 1)).toBe(true);
  });

  it("réserve la gestion aux administrateurs et refuse un champ non modifiable", async () => {
    await expectCode(memberApi.automations.list(), "FORBIDDEN");
    await expectCode(
      ownerApi.automations.save({
        name: "Invalide",
        entity: "ticket",
        trigger: "created",
        conditions: empty,
        actions: [{ type: "set_field", field: "resolvedAt", value: "2026-01-01" }],
        active: true,
      }),
      "BAD_REQUEST",
    );
  });
});

describe("webhooks", () => {
  it("crée une livraison par évènement abonné, avec un secret affiché une fois", async () => {
    const { id, secret } = await ownerApi.integrations.saveWebhook({
      url: "https://exemple.fr/hook",
      events: ["supplier.created"],
      active: true,
    });
    expect(secret).toMatch(/^whsec_/);
    expect((await ownerApi.integrations.webhookSecret({ id })).secret).toBe(secret);
    const stored = await prisma.webhook.findUniqueOrThrow({ where: { id } });
    expect(stored.secret).not.toContain(secret!);

    await ownerApi.records.create({ entity: "supplier", values: { name: "Papeterie" } });
    await ownerApi.records.create({ entity: "warehouse", values: { name: "Dépôt" } });
    const deliveries = await prisma.webhookDelivery.findMany({ where: { webhookId: id } });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]!.event).toBe("supplier.created");
    expect((deliveries[0]!.payload as { data: { name: string } }).data.name).toBe("Papeterie");
  });
});

describe("API publique", () => {
  const call = (
    handler: (r: NextRequest, c: { params: Promise<Record<string, string>> }) => Promise<Response>,
    url: string,
    key: string,
    params: Record<string, string>,
    init: { method?: string; body?: unknown } = {},
  ) =>
    handler(
      new NextRequest(`http://localhost${url}`, {
        method: init.method ?? "GET",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: init.body ? JSON.stringify(init.body) : undefined,
      }),
      { params: Promise.resolve(params) },
    );

  it("lit et écrit avec les droits de la clé ; lecture seule, révocation, erreurs", async () => {
    const { key: write } = await ownerApi.integrations.createKey({
      name: "Zapier",
      scope: "write",
    });
    const { key: read } = await ownerApi.integrations.createKey({ name: "Tableur", scope: "read" });

    const created = await call(
      create as never,
      "/api/v1/company",
      write,
      { entity: "company" },
      {
        method: "POST",
        body: { name: "Client API", email: "api@client.fr" },
      },
    );
    expect(created.status).toBe(201);
    const { data } = (await created.json()) as { data: { id: string; name: string } };
    expect(data.name).toBe("Client API");

    const one = await call(getOne as never, `/api/v1/company/${data.id}`, read, {
      entity: "company",
      id: data.id,
    });
    expect(one.status).toBe(200);
    const page = await call(list as never, "/api/v1/company?search=Client%20API&limit=5", read, {
      entity: "company",
    });
    expect(((await page.json()) as { total: number }).total).toBe(1);

    const forbidden = await call(
      create as never,
      "/api/v1/company",
      read,
      { entity: "company" },
      {
        method: "POST",
        body: { name: "Refusé" },
      },
    );
    expect(forbidden.status).toBe(403);
    const invalid = await call(
      create as never,
      "/api/v1/company",
      write,
      { entity: "company" },
      {
        method: "POST",
        body: { email: "sans-nom@client.fr" },
      },
    );
    expect(invalid.status).toBe(400);
    expect((await call(list as never, "/api/v1/nope", read, { entity: "nope" })).status).toBe(404);
    expect(
      (await call(list as never, "/api/v1/company", "qk_faux", { entity: "company" })).status,
    ).toBe(401);

    const keys = (await ownerApi.integrations.overview()).keys;
    await ownerApi.integrations.revokeKey({ id: keys.find((k) => k.name === "Tableur")!.id });
    expect((await call(list as never, "/api/v1/company", read, { entity: "company" })).status).toBe(
      401,
    );
  });

  it("décrit toutes les ressources en OpenAPI", () => {
    const doc = openApiDocument("https://app.quercy.fr");
    expect(doc.servers[0]!.url).toBe("https://app.quercy.fr/api/v1");
    expect(Object.keys(doc.paths)).toContain("/invoice/{id}");
    expect(doc.paths["/invoice"]).not.toHaveProperty("post");
    expect(doc.paths["/company"]).toHaveProperty("post");
  });
});
