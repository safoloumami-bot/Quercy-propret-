import { addDays, dayKey, parseDay, todayIn } from "@quercy/core";
import { prisma } from "@quercy/db";
import { alertVehicleDues } from "@quercy/jobs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { expectCode, testFixtures } from "./helpers";

const { handleTerrainApi } = await import("../terrain/api");
const { terrainOrg } = await import("../terrain/org");
const { newPin } = await import("../terrain/session");
const { consumeForIntervention } = await import("../equipment/service");

const fx = testFixtures("materiel");
type Api = Awaited<ReturnType<typeof fx.caller>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
let orgId: string;
let slug: string;
let owner: Api;
let alice: Api;
const ids: Record<string, string> = {};
const today = parseDay(todayIn());

function phone() {
  let cookie = "";
  return async (route: string, body?: unknown) => {
    const org = (await terrainOrg(slug))!;
    const response = await handleTerrainApi(
      new Request(`http://localhost/terrain/${slug}/api/${route}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": `ip-${Math.random()}`,
          ...(cookie ? { cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      org,
      route.split("?")[0]!,
    );
    const set = response.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0]!;
    return { status: response.status, data: (await response.json()) as Json };
  };
}

beforeAll(async () => {
  const org = await fx.org("a");
  orgId = org.id;
  slug = org.slug;
  for (const [key, role] of [
    ["owner", "owner"],
    ["alice", "worker"],
  ] as const) {
    const created = await fx.user(key);
    const u = await prisma.user.update({ where: { id: created.id }, data: { name: key } });
    ids[key] = u.id;
    await fx.member(orgId, u.id, role);
    if (key === "owner") owner = await fx.caller(u, orgId);
    if (key === "alice") alice = await fx.caller(u, orgId);
  }
  await prisma.fieldAccess.create({
    data: {
      organizationId: orgId,
      userId: ids.alice!,
      code: "alice",
      role: "agent",
      ...newPin("135791"),
    },
  });
});

afterAll(async () => {
  await prisma.stockMovement.deleteMany({ where: { organizationId: orgId } });
  await prisma.interventionConsumable.deleteMany({ where: { organizationId: orgId } });
  await prisma.interventionEvent.deleteMany({ where: { organizationId: orgId } });
  await prisma.intervention.deleteMany({ where: { organizationId: orgId } });
  await prisma.assetReport.deleteMany({ where: { organizationId: orgId } });
  await prisma.rental.deleteMany({ where: { organizationId: orgId } });
  await prisma.equipmentMovement.deleteMany({ where: { organizationId: orgId } });
  await prisma.equipment.deleteMany({ where: { organizationId: orgId } });
  await fx.cleanup();
  await prisma.$disconnect();
});

describe("matériel et locations", () => {
  it("chaque changement d'état ou d'affectation entre au journal du matériel", async () => {
    const e = await owner.records.create({
      entity: "equipment",
      values: { name: "Monobrosse Taski", rentable: true },
    });
    ids.machine = e.id as string;
    await owner.assets.moveEquipment({
      equipmentId: ids.machine,
      status: "assigned_agent",
      assignedUserId: ids.alice!,
      note: "Pour la tournée du lundi",
    });
    // Même état, même affectation : pas de nouvelle ligne.
    await owner.assets.moveEquipment({
      equipmentId: ids.machine,
      status: "assigned_agent",
      assignedUserId: ids.alice!,
    });
    const h = await owner.assets.equipmentHistory({ equipmentId: ids.machine });
    expect(h.movements.map((m) => m.statusLabel)).toEqual(["Affecté à un salarié", "En stock"]);
    expect(h.movements[0]).toMatchObject({ location: "alice", note: "Pour la tournée du lundi" });
    await expectCode(
      alice.assets.moveEquipment({ equipmentId: ids.machine, status: "in_stock" }),
      "NOT_FOUND",
    );
  });

  it("location : référence, pas de double location, sortie, retour et facture", async () => {
    const start = dayKey(addDays(today, 2));
    const end = dayKey(addDays(today, 10));
    const company = await owner.records.create({
      entity: "company",
      values: { name: "BTP Lot" },
    });
    const r = await owner.records.create({
      entity: "rental",
      values: {
        equipmentId: ids.machine,
        companyId: company.id,
        startDate: start,
        endDate: end,
        period: "week",
        unitPriceCents: 120,
        depositCents: 300,
      },
    });
    ids.rental = r.id as string;
    const year = new Date().getFullYear();
    const saved = await prisma.rental.findUniqueOrThrow({ where: { id: ids.rental } });
    expect(saved.reference).toBe(`LOC-${year}-0001`);
    expect(saved.unitPriceCents).toBe(12000);

    await expectCode(
      owner.records.create({
        entity: "rental",
        values: {
          equipmentId: ids.machine,
          startDate: dayKey(addDays(today, 9)),
          endDate: dayKey(addDays(today, 12)),
          period: "day",
          unitPriceCents: 30,
        },
      }),
      "CONFLICT",
    );

    const info = await owner.assets.rental({ rentalId: ids.rental });
    // 9 jours, tarif à la semaine : 2 semaines entamées.
    expect(info).toMatchObject({ periods: 2, periodLabel: "semaines", amountCents: 24000 });

    await owner.assets.setRentalStatus({ rentalId: ids.rental, status: "out" });
    expect((await prisma.equipment.findUniqueOrThrow({ where: { id: ids.machine } })).status).toBe(
      "rented",
    );
    await owner.assets.setRentalStatus({
      rentalId: ids.rental,
      status: "returned",
      depositReturned: true,
    });
    const back = await prisma.equipment.findUniqueOrThrow({ where: { id: ids.machine } });
    expect(back.status).toBe("in_stock");
    const history = await owner.assets.equipmentHistory({ equipmentId: ids.machine! });
    expect(history.movements.slice(0, 2).map((m) => m.note)).toEqual([
      "Retour de location",
      "Sortie en location",
    ]);

    const { invoiceId } = await owner.assets.invoiceRental({ rentalId: ids.rental });
    const invoice = await prisma.salesDocument.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { lines: true },
    });
    expect(invoice).toMatchObject({ kind: "INVOICE", status: "draft", companyId: company.id });
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.lines[0]!.quantity).toBe(2);
    expect(invoice.lines[0]!.unitPriceCents).toBe(12000);
    await expectCode(owner.assets.invoiceRental({ rentalId: ids.rental }), "BAD_REQUEST");
  });
});

describe("stock par emplacement", () => {
  it("réception partielle puis totale, transfert vers un véhicule, consommation à la clôture", async () => {
    const supplier = await owner.records.create({
      entity: "supplier",
      values: { name: "Hygiène Pro" },
    });
    const product = await owner.records.create({
      entity: "product",
      values: { name: "Sacs 100 L", type: "good", unitPrice: 15, reorderLevel: 5 },
    });
    ids.product = product.id as string;
    const warehouse = await owner.records.create({
      entity: "warehouse",
      values: { name: "Dépôt Cahors" },
    });
    const vehicle = await owner.records.create({
      entity: "vehicle",
      values: { plate: "AB-123-CD", model: "Kangoo", assignedUserId: ids.alice!, mileage: 42000 },
    });
    ids.vehicle = vehicle.id as string;

    await owner.assets.saveSupplierPrice({
      supplierId: supplier.id as string,
      productId: ids.product,
      priceCents: 1250,
      supplierRef: "SAC100",
    });
    const order = await owner.records.create({
      entity: "purchaseOrder",
      values: { supplierId: supplier.id },
    });
    const orderId = order.id as string;
    await owner.assets.savePurchaseLines({
      purchaseOrderId: orderId,
      lines: [{ productId: ids.product, label: "Sacs 100 L", quantity: 20, unitPriceCents: 1250 }],
    });
    const lines = await owner.assets.purchaseLines({ purchaseOrderId: orderId });
    expect(lines.totalExclCents).toBe(25000);
    expect(lines.supplierPrices[0]).toMatchObject({ priceCents: 1250 });
    const lineId = lines.lines[0]!.id;

    expect(
      await owner.assets.receivePurchase({
        purchaseOrderId: orderId,
        warehouseId: warehouse.id as string,
        lines: [{ lineId, quantity: 12 }],
      }),
    ).toEqual({ status: "partial" });
    await expectCode(
      owner.assets.savePurchaseLines({ purchaseOrderId: orderId, lines: [] }),
      "CONFLICT",
    );
    await expectCode(
      owner.assets.receivePurchase({
        purchaseOrderId: orderId,
        lines: [{ lineId, quantity: 9 }],
      }),
      "BAD_REQUEST",
    );
    expect(
      await owner.assets.receivePurchase({
        purchaseOrderId: orderId,
        warehouseId: warehouse.id as string,
        lines: [{ lineId, quantity: 8 }],
      }),
    ).toEqual({ status: "received" });

    await owner.assets.transferStock({
      productId: ids.product,
      quantity: 6,
      from: { kind: "warehouse", id: warehouse.id as string },
      to: { kind: "vehicle", id: ids.vehicle },
    });
    let byPlace = await owner.assets.stockByLocation({ productId: ids.product });
    expect(byPlace.map((l) => [l.label, l.quantity])).toEqual([
      ["Dépôt Cahors", 14],
      ["Véhicule AB-123-CD", 6],
    ]);

    // Passage clôturé : 4 sacs relevés, sortis du véhicule de l'agente.
    const visit = await prisma.intervention.create({
      data: { organizationId: orgId, title: "Passage", date: today, ownerId: ids.alice! },
    });
    await prisma.interventionConsumable.create({
      data: {
        organizationId: orgId,
        interventionId: visit.id,
        label: "Sacs 100 L",
        productId: ids.product,
        quantity: 4,
      },
    });
    await consumeForIntervention(orgId, visit.id, ids.alice!, "BI-TEST");
    // Rejouer ne double pas la sortie.
    const crossed = await consumeForIntervention(orgId, visit.id, ids.alice!, "BI-TEST");
    expect(crossed).toEqual([]);
    byPlace = await owner.assets.stockByLocation({ productId: ids.product });
    expect(byPlace.find((l) => l.kind === "vehicle")!.quantity).toBe(2);
    const stocked = await prisma.product.findUniqueOrThrow({ where: { id: ids.product } });
    expect(stocked.stockQuantity).toBe(16);
  });
});

describe("véhicules", () => {
  it("état des lieux et panne depuis l'application ; le compteur ne recule pas", async () => {
    const api = phone();
    expect((await api("connexion", { code: "alice", pin: "135791" })).status).toBe(200);
    const tour = await api(`tournee?d=${dayKey(today)}`);
    expect(tour.data.materiel.vehicules).toEqual([
      expect.objectContaining({ immat: "AB-123-CD", km: 42000, faitAujourdhui: false }),
    ]);
    expect(
      (await api("etat-materiel", { type: "etat", vehicule: ids.vehicle, km: "41000" })).status,
    ).toBe(400);
    expect((await api("etat-materiel", { type: "etat", vehicule: ids.vehicle })).status).toBe(400);
    const ok = await api("etat-materiel", {
      type: "etat",
      vehicule: ids.vehicle,
      km: "42350",
      note: "Rayure portière arrière",
    });
    expect(ok.status).toBe(200);
    expect(ok.data.materiel.vehicules[0]).toMatchObject({ km: 42350, faitAujourdhui: true });
    expect((await api("etat-materiel", { type: "panne", vehicule: ids.vehicle })).status).toBe(400);
    const panne = await api("etat-materiel", {
      type: "panne",
      vehicule: ids.vehicle,
      note: "Voyant moteur allumé",
    });
    expect(panne.data.materiel.vehicules[0].pannes).toEqual([
      expect.objectContaining({ note: "Voyant moteur allumé" }),
    ]);
    const v = await prisma.vehicle.findUniqueOrThrow({ where: { id: ids.vehicle } });
    expect(v).toMatchObject({ mileage: 42350, status: "broken" });
    const notes = await prisma.notification.findMany({
      where: { organizationId: orgId, userId: ids.owner!, type: { startsWith: "asset." } },
      orderBy: { createdAt: "asc" },
    });
    expect(notes.map((n) => n.title)).toEqual([
      "État des lieux avec remarque : AB-123-CD (Kangoo)",
      "Panne signalée : AB-123-CD (Kangoo)",
    ]);
    const reports = await owner.assets.reports({ vehicleId: ids.vehicle });
    expect(reports.map((r) => r.kind)).toEqual(["breakdown", "inspection"]);
    await owner.assets.resolveReport({ id: reports[0]!.id, resolution: "Sonde changée" });
    expect((await owner.assets.reports({ vehicleId: ids.vehicle }))[0]!.status).toBe("resolved");
  });

  it("échéances : une alerte par échéance, réarmée quand la date change", async () => {
    await prisma.vehicle.update({
      where: { id: ids.vehicle },
      data: {
        inspectionDueDate: addDays(today, 12),
        insuranceDueDate: addDays(today, 200),
        nextServiceMileage: 42000,
      },
    });
    const dues = await owner.assets.vehicleDues({ vehicleId: ids.vehicle! });
    expect(dues.map((d) => d.label.replace(/\s/g, " "))).toEqual([
      "Contrôle technique",
      "Entretien des 42 000 km",
    ]);
    const count = () =>
      prisma.notification.count({
        where: { organizationId: orgId, userId: ids.owner!, type: "vehicle.due" },
      });
    await alertVehicleDues();
    expect(await count()).toBe(2);
    await alertVehicleDues();
    expect(await count()).toBe(2);
    await prisma.vehicle.update({
      where: { id: ids.vehicle },
      data: { inspectionDueDate: addDays(today, 20) },
    });
    await alertVehicleDues();
    expect(await count()).toBe(3);
  });
});

describe("consommables de la fiche mission", () => {
  it("la fiche prévoit des articles du stock ; le passage les reprend avec leur article", async () => {
    const site = await prisma.site.create({
      data: { organizationId: orgId, name: "Résidence Lot", code: "RL" },
    });
    await expectCode(
      owner.missions.save({
        siteId: site.id,
        title: "Fiche",
        tasks: [],
        consumables: [{ productId: "inconnu", plannedQuantity: 1 }],
      }),
      "BAD_REQUEST",
    );
    await owner.missions.save({
      siteId: site.id,
      title: "Fiche",
      tasks: [{ zone: "Hall", label: "Sols" }],
      consumables: [{ productId: ids.product!, plannedQuantity: 2 }],
    });
    const list = await owner.missions.list({ siteId: site.id });
    expect(list.sheets[0]!.consumables).toEqual([
      expect.objectContaining({ name: "Sacs 100 L", plannedQuantity: 2 }),
    ]);
    expect(list.products.map((p) => p.name)).toContain("Sacs 100 L");

    const visit = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Passage Résidence Lot",
        date: today,
        siteId: site.id,
        ownerId: ids.alice!,
      },
    });
    const api = phone();
    await api("connexion", { code: "alice", pin: "135791" });
    const opened = await api(`chantier?id=${visit.id}`);
    expect(opened.status).toBe(200);
    await api("releve", { id: visit.id, cons: [3] });
    const cons = await prisma.interventionConsumable.findMany({
      where: { interventionId: visit.id },
    });
    expect(cons).toEqual([
      expect.objectContaining({ label: "Sacs 100 L", productId: ids.product, quantity: 3 }),
    ]);
    await prisma.missionTask.deleteMany({ where: { organizationId: orgId } });
    await prisma.missionConsumable.deleteMany({ where: { organizationId: orgId } });
    await prisma.missionSheetVersion.deleteMany({ where: { organizationId: orgId } });
    await prisma.missionSheet.deleteMany({ where: { organizationId: orgId } });
    await prisma.interventionTask.deleteMany({ where: { organizationId: orgId } });
  });
});
