import "server-only";

import {
  EQUIPMENT_STATUSES,
  labelOf,
  recordPath,
  rentalsOverlap,
  stockDelta,
  stockLocation,
} from "@quercy/core";
import { prisma } from "@quercy/db";

import { notify } from "../notify";

const statusLabel = (status: string) => labelOf(EQUIPMENT_STATUSES, status);

/**
 * Historique des mouvements du matériel : à chaque changement d'état ou d'affectation
 * (fiche, modification groupée, import, location), une ligne est ajoutée. Un premier
 * mouvement est noté à la création.
 */
export async function trackEquipment(
  organizationId: string,
  ids: string[],
  movedById: string | null,
  note?: string,
): Promise<number> {
  if (ids.length === 0) return 0;
  const items = await prisma.equipment.findMany({
    where: { organizationId, id: { in: ids } },
    include: {
      assignedUser: { select: { name: true } },
      site: { select: { name: true } },
      warehouse: { select: { name: true } },
      movements: { orderBy: { at: "desc" }, take: 1 },
    },
  });
  let created = 0;
  for (const e of items) {
    const last = e.movements[0];
    const same =
      last &&
      last.status === e.status &&
      last.assignedUserId === e.assignedUserId &&
      last.siteId === e.siteId &&
      last.warehouseId === e.warehouseId;
    if (same) continue;
    const location =
      [e.assignedUser?.name, e.site?.name, e.warehouse?.name].filter(Boolean).join(" · ") || null;
    await prisma.equipmentMovement.create({
      data: {
        organizationId,
        equipmentId: e.id,
        status: e.status,
        location: location ?? statusLabel(e.status),
        assignedUserId: e.assignedUserId,
        siteId: e.siteId,
        warehouseId: e.warehouseId,
        note: note ?? null,
        movedById,
      },
    });
    created++;
  }
  return created;
}

/** Locations qui chevauchent une période pour ce matériel (hors annulées). */
export async function overlappingRentals(
  organizationId: string,
  rental: { id?: string; equipmentId: string; startDate: Date; endDate: Date },
) {
  const others = await prisma.rental.findMany({
    where: {
      organizationId,
      equipmentId: rental.equipmentId,
      deletedAt: null,
      status: { not: "cancelled" },
      ...(rental.id ? { id: { not: rental.id } } : {}),
    },
    select: { id: true, reference: true, startDate: true, endDate: true },
  });
  return others.filter((o) => rentalsOverlap(o, rental));
}

/**
 * Après une écriture de locations : référence lisible, et état du matériel tenu à jour
 * (« loué » pendant une sortie, « en stock » au retour).
 */
export async function afterRentalChange(
  organizationId: string,
  ids: string[],
  userId: string | null,
): Promise<void> {
  const rentals = await prisma.rental.findMany({
    where: { organizationId, id: { in: ids } },
    select: { id: true, reference: true, equipmentId: true, createdAt: true },
  });
  for (const r of rentals.filter((x) => !x.reference)) {
    const year = r.createdAt.getFullYear();
    const seq = await prisma.numberSequence.upsert({
      where: { organizationId_key: { organizationId, key: `location-${year}` } },
      create: { organizationId, key: `location-${year}`, value: 1 },
      update: { value: { increment: 1 } },
    });
    await prisma.rental.update({
      where: { id: r.id },
      data: { reference: `LOC-${year}-${String(seq.value).padStart(4, "0")}` },
    });
  }
  const equipmentIds = [...new Set(rentals.map((r) => r.equipmentId))];
  for (const equipmentId of equipmentIds) {
    const [out, equipment] = await Promise.all([
      prisma.rental.count({
        where: { organizationId, equipmentId, status: "out", deletedAt: null },
      }),
      prisma.equipment.findFirst({ where: { id: equipmentId, organizationId } }),
    ]);
    if (!equipment) continue;
    const next = out
      ? "rented"
      : equipment.status === "rented" || equipment.status === "reserved"
        ? "in_stock"
        : equipment.status;
    if (next !== equipment.status) {
      await prisma.equipment.update({ where: { id: equipmentId }, data: { status: next } });
      await trackEquipment(
        organizationId,
        [equipmentId],
        userId,
        next === "rented" ? "Sortie en location" : "Retour de location",
      );
    }
  }
}

/**
 * Stock d'articles recalculé à partir des mouvements (entrées − sorties ± ajustements).
 * Renvoie les articles qui viennent de passer sous leur seuil de réassort.
 */
export async function recomputeProductStock(organizationId: string, productIds: string[]) {
  const crossed: { productId: string; name: string; quantity: number; ownerId: string | null }[] =
    [];
  for (const productId of [...new Set(productIds)]) {
    const rows = await prisma.stockMovement.groupBy({
      by: ["type"],
      where: { organizationId, productId, deletedAt: null },
      _sum: { quantity: true },
    });
    const sum = (type: string) => rows.find((r) => r.type === type)?._sum.quantity ?? 0;
    const quantity = sum("in") - sum("out") + sum("adjust");
    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId },
      select: { stockQuantity: true, reorderLevel: true, name: true, ownerId: true },
    });
    if (!product) continue;
    await prisma.product.update({ where: { id: productId }, data: { stockQuantity: quantity } });
    const threshold = product.reorderLevel;
    if (threshold !== null && quantity <= threshold && product.stockQuantity > threshold)
      crossed.push({ productId, name: product.name, quantity, ownerId: product.ownerId });
  }
  return crossed;
}

/** Prévient le responsable de chaque article passé sous son seuil de réassort. */
export async function alertLowStock(
  organizationId: string,
  crossed: Awaited<ReturnType<typeof recomputeProductStock>>,
  fallbackUserIds: string[],
) {
  for (const product of crossed)
    await notify({
      organizationId,
      userIds: product.ownerId ? [product.ownerId] : fallbackUserIds,
      actorId: "system",
      type: "stock.low",
      title: `Stock bas : « ${product.name} » (${product.quantity} restant${product.quantity > 1 ? "s" : ""})`,
      url: recordPath("product", product.productId),
    });
}

/** Stock d'un article par emplacement (dépôt, véhicule, salarié, site, non localisé). */
export async function stockByLocation(organizationId: string, productId: string) {
  const moves = await prisma.stockMovement.findMany({
    where: { organizationId, productId, deletedAt: null },
    select: {
      type: true,
      quantity: true,
      warehouseId: true,
      vehicleId: true,
      holderId: true,
      siteId: true,
      warehouse: { select: { name: true } },
      vehicle: { select: { plate: true } },
      holder: { select: { name: true } },
      site: { select: { name: true } },
    },
  });
  const byKey = new Map<
    string,
    { kind: string; id: string | null; label: string; quantity: number }
  >();
  for (const m of moves) {
    const loc = stockLocation(m);
    const key = `${loc.kind}:${loc.id ?? ""}`;
    const label =
      loc.kind === "warehouse"
        ? (m.warehouse?.name ?? "Dépôt")
        : loc.kind === "vehicle"
          ? `Véhicule ${m.vehicle?.plate ?? ""}`.trim()
          : loc.kind === "holder"
            ? (m.holder?.name ?? "Salarié")
            : loc.kind === "site"
              ? (m.site?.name ?? "Site")
              : "Non localisé";
    const entry = byKey.get(key) ?? { kind: loc.kind, id: loc.id, label, quantity: 0 };
    entry.quantity += stockDelta(m);
    byKey.set(key, entry);
  }
  return [...byKey.values()]
    .filter((e) => Math.abs(e.quantity) > 1e-9)
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

const frDay = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Contrôles avant écriture qui demandent la base : un matériel ne peut pas être loué deux
 * fois sur des jours qui se chevauchent.
 */
export async function assertRecordConstraints(
  organizationId: string,
  entity: string,
  data: Record<string, unknown>,
  current?: Record<string, unknown> & { id?: unknown },
): Promise<string | null> {
  if (entity !== "rental") return null;
  const status = (data.status ?? current?.status) as string | undefined;
  if (status === "cancelled" || status === "returned") return null;
  const equipmentId = (data.equipmentId ?? current?.equipmentId) as string | undefined;
  const startDate = (data.startDate ?? current?.startDate) as Date | undefined;
  const endDate = (data.endDate ?? current?.endDate) as Date | undefined;
  if (!equipmentId || !startDate || !endDate) return null;
  const clash = await overlappingRentals(organizationId, {
    id: current?.id ? String(current.id) : undefined,
    equipmentId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });
  if (!clash.length) return null;
  const c = clash[0]!;
  return `Ce matériel est déjà loué du ${frDay(c.startDate)} au ${frDay(c.endDate)}${c.reference ? ` (${c.reference})` : ""}.`;
}

/**
 * Consommation réelle d'un passage clôturé : une sortie de stock par article relevé (quantité
 * > 0), prise dans le véhicule de l'agent s'il en a un. Rejouable : les sorties du passage
 * sont remplacées. Renvoie les articles passés sous leur seuil.
 */
export async function consumeForIntervention(
  organizationId: string,
  interventionId: string,
  userId: string,
  reference: string | null,
) {
  const consumables = await prisma.interventionConsumable.findMany({
    where: { organizationId, interventionId, productId: { not: null }, quantity: { gt: 0 } },
    select: { productId: true, quantity: true },
  });
  const previous = await prisma.stockMovement.findMany({
    where: { organizationId, interventionId, type: "out" },
    select: { productId: true },
  });
  if (!consumables.length && !previous.length) return [];
  const vehicle = await prisma.vehicle.findFirst({
    where: { organizationId, assignedUserId: userId, deletedAt: null },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.stockMovement.deleteMany({ where: { organizationId, interventionId, type: "out" } }),
    prisma.stockMovement.createMany({
      data: consumables.map((c) => ({
        organizationId,
        productId: c.productId!,
        type: "out",
        quantity: c.quantity,
        interventionId,
        vehicleId: vehicle?.id ?? null,
        reference,
        note: "Consommation relevée sur le passage",
        ownerId: userId,
      })),
    }),
  ]);
  return recomputeProductStock(organizationId, [
    ...consumables.map((c) => c.productId!),
    ...previous.map((p) => p.productId),
  ]);
}
