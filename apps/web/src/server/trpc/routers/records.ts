import {
  CUSTOM_PREFIX,
  EMPTY_FILTER,
  ENTITIES,
  ENTITY_KEYS,
  type EntityKey,
  type FieldDef,
  buildOrderBy,
  buildWhere,
  diffChanges,
  filterGroupSchema,
  isCustomKey,
  parseRecordInput,
  recordTitle,
  filterRuleSchema,
  sortSpecSchema,
} from "@quercy/core";
import { type Prisma, prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { notify } from "../../notify";
import { publish } from "../../realtime";
import { type RecordsCtx, delegate, entityContext } from "../../records/context";
import { searchWhere } from "../../records/search";
import { listInclude, serialize } from "../../records/serialize";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";

const entitySchema = z.enum(ENTITY_KEYS);
const idsSchema = z.array(z.string().min(1)).min(1).max(1000);
const valuesSchema = z.record(z.string(), z.unknown());

const listInput = z.object({
  entity: entitySchema,
  filter: filterGroupSchema.default(EMPTY_FILTER),
  sort: z.array(sortSpecSchema).max(5).default([]),
  search: z.string().max(120).optional(),
  /** Condition supplémentaire combinée en ET (lignes d'un groupe). */
  and: filterRuleSchema.optional(),
  /** Décalage de la page (pagination infinie). */
  cursor: z.number().int().min(0).nullish(),
  limit: z.number().int().min(1).max(200).default(100),
});

function recordUrl(entity: EntityKey, id: string) {
  const def = ENTITIES[entity];
  return `/${def.module}/${def.slug}/${id}`;
}

/** Vérifie que les références (responsable, entreprise) appartiennent bien à l'espace. */
async function assertReferences(ctx: RecordsCtx, data: Record<string, unknown>) {
  if (typeof data.ownerId === "string") {
    const member = await ctx.db.membership.count({ where: { userId: data.ownerId } });
    if (!member)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Le responsable choisi n'est pas membre de l'espace.",
      });
  }
  if (typeof data.companyId === "string") {
    const company = await ctx.db.company.count({ where: { id: data.companyId } });
    if (!company)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cette entreprise n'existe pas dans l'espace.",
      });
  }
}

function invalid(errors: Record<string, string>): never {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: Object.values(errors)[0] ?? "Saisie invalide.",
    cause: { fieldErrors: errors } as never,
  });
}

async function findScoped(
  ctx: RecordsCtx,
  entity: EntityKey,
  ids: string[],
  scope: Record<string, unknown>,
) {
  const rows = await delegate(ctx, entity).findMany({ where: { id: { in: ids }, ...scope } });
  return rows as unknown as Record<string, unknown>[];
}

export const recordsRouter = createTRPCRouter({
  /** Page d'enregistrements (filtres, tri, recherche), pour la pagination infinie du tableau. */
  list: orgProcedure.input(listInput).query(async ({ ctx, input }) => {
    const { def, fields, scopeWhere } = await entityContext(ctx, input.entity, "view");
    const where = {
      AND: [
        scopeWhere,
        buildWhere(fields, input.filter),
        searchWhere(def, input.search),
        input.and ? buildWhere(fields, { combinator: "and", rules: [input.and] }) : {},
      ],
    };
    const model = delegate(ctx, input.entity);
    const [rows, total] = await Promise.all([
      model.findMany({
        where,
        orderBy: buildOrderBy(fields, input.sort, def.defaultSort) as never,
        skip: input.cursor ?? 0,
        take: input.limit,
        include: listInclude(input.entity) as never,
      }),
      model.count({ where }),
    ]);
    const offset = input.cursor ?? 0;
    const nextCursor = offset + rows.length < total ? offset + rows.length : null;
    return { rows: rows.map((r) => serialize(input.entity, r as never)), total, nextCursor };
  }),

  /** Groupes (valeur, nombre, sous-totaux) pour l'affichage regroupé. */
  groups: orgProcedure
    .input(
      listInput
        .pick({ entity: true, filter: true, search: true })
        .extend({ groupBy: z.string().max(80) }),
    )
    .query(async ({ ctx, input }) => {
      const { def, fields, scopeWhere } = await entityContext(ctx, input.entity, "view");
      const field = fields.find(
        (f) => f.key === input.groupBy && f.groupable && !isCustomKey(f.key),
      );
      if (!field)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ce champ ne permet pas le regroupement.",
        });
      const column = field.column ?? field.key;
      const sums = fields
        .filter((f) => f.aggregate === "sum" && !isCustomKey(f.key))
        .map((f) => f.key);
      const avgs = fields
        .filter((f) => f.aggregate === "avg" && !isCustomKey(f.key))
        .map((f) => f.key);
      const where = {
        AND: [scopeWhere, buildWhere(fields, input.filter), searchWhere(def, input.search)],
      };
      const grouped = (await delegate(ctx, input.entity).groupBy({
        by: [column] as never,
        where,
        _count: { _all: true },
        ...(sums.length ? { _sum: Object.fromEntries(sums.map((k) => [k, true])) } : {}),
        ...(avgs.length ? { _avg: Object.fromEntries(avgs.map((k) => [k, true])) } : {}),
        orderBy: { [column]: "asc" },
      } as never)) as unknown as Array<Record<string, unknown> & { _count: { _all: number } }>;

      // Libellés des valeurs (options, personnes, entreprises).
      const values = grouped
        .map((g) => g[column])
        .filter((v): v is string => typeof v === "string");
      const labels = new Map<string, string>();
      if (field.type === "user" && values.length) {
        for (const u of await prisma.user.findMany({
          where: { id: { in: values } },
          select: { id: true, name: true },
        }))
          labels.set(u.id, u.name);
      } else if (field.type === "relation" && values.length) {
        for (const c of await ctx.db.company.findMany({
          where: { id: { in: values } },
          select: { id: true, name: true },
        }))
          labels.set(c.id, c.name);
      } else {
        for (const o of field.options ?? []) labels.set(o.value, o.label);
      }
      return grouped.map((g) => {
        const value = (g[column] ?? null) as string | null;
        return {
          value,
          label: value === null ? "Non renseigné" : (labels.get(value) ?? value),
          count: g._count._all,
          aggregates: {
            ...Object.fromEntries(
              sums.map((k) => [k, ((g._sum as Record<string, number | null>) ?? {})[k] ?? 0]),
            ),
            ...Object.fromEntries(
              avgs.map((k) => [k, ((g._avg as Record<string, number | null>) ?? {})[k] ?? null]),
            ),
          },
        };
      });
    }),

  /** Fiche complète. */
  get: orgProcedure
    .input(z.object({ entity: entitySchema, id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, input.entity, "view");
      const record = await delegate(ctx, input.entity).findFirst({
        where: { id: input.id, ...scopeWhere },
        include: listInclude(input.entity) as never,
      });
      if (!record)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cette fiche n'existe pas ou a été supprimée.",
        });
      const row = serialize(input.entity, record as never);
      const canEdit = await entityContext(ctx, input.entity, "update")
        .then(
          async ({ scopeWhere: editable }) =>
            (await delegate(ctx, input.entity).count({ where: { id: input.id, ...editable } })) > 0,
        )
        .catch(() => false);
      return { row, canEdit };
    }),

  create: orgProcedure
    .input(z.object({ entity: entitySchema, values: valuesSchema }))
    .mutation(async ({ ctx, input }) => {
      const { fields, scope } = await entityContext(ctx, input.entity, "create");
      const parsed = parseRecordInput(fields, input.values, "create");
      if (!parsed.success) invalid(parsed.errors);
      const data = { ...parsed.value.data };
      // Sans responsable choisi, la personne qui crée devient responsable (indispensable pour « les siens »).
      if (data.ownerId === undefined || data.ownerId === null || scope === "own")
        data.ownerId = ctx.user.id;
      await assertReferences(ctx, data);
      const created = (await delegate(ctx, input.entity).create({
        data: {
          ...data,
          organizationId: ctx.organizationId,
          customFields: parsed.value.customFields,
        } as never,
        include: listInclude(input.entity) as never,
      })) as unknown as Record<string, unknown> & { id: string };
      await recordAudit(ctx, {
        action: "record.create",
        entityType: input.entity,
        entityId: created.id,
        metadata: { name: recordTitle(input.entity, created) },
      });
      await publish(ctx.organizationId, {
        type: "record.changed",
        entity: input.entity,
        ids: [created.id],
        actorId: ctx.user.id,
      });
      return serialize(input.entity, created);
    }),

  /** Modification (fiche ou cellule) : seuls les champs fournis changent ; l'historique garde avant/après. */
  update: orgProcedure
    .input(z.object({ entity: entitySchema, id: z.string().min(1), values: valuesSchema }))
    .mutation(async ({ ctx, input }) => {
      const { fields, scopeWhere } = await entityContext(ctx, input.entity, "update");
      const [current] = await findScoped(ctx, input.entity, [input.id], scopeWhere);
      if (!current)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fiche introuvable ou hors de votre périmètre.",
        });
      const parsed = parseRecordInput(fields, input.values, "update");
      if (!parsed.success) invalid(parsed.errors);
      await assertReferences(ctx, parsed.value.data);

      const beforeCustom = (current.customFields ?? {}) as Record<string, unknown>;
      const nextCustom = { ...beforeCustom, ...parsed.value.customFields };
      const changes = {
        ...diffChanges(current, parsed.value.data),
        ...Object.fromEntries(
          Object.entries(diffChanges(beforeCustom, parsed.value.customFields)).map(([k, v]) => [
            `${CUSTOM_PREFIX}${k}`,
            v,
          ]),
        ),
      };
      const updated = (await delegate(ctx, input.entity).update({
        where: { id: input.id },
        data: { ...parsed.value.data, customFields: nextCustom as Prisma.InputJsonValue } as never,
        include: listInclude(input.entity) as never,
      })) as unknown as Record<string, unknown> & { id: string };

      if (Object.keys(changes).length > 0) {
        await recordAudit(ctx, {
          action: "record.update",
          entityType: input.entity,
          entityId: input.id,
          changes,
          metadata: { name: recordTitle(input.entity, updated) },
        });
        const newOwner = parsed.value.data.ownerId;
        if (typeof newOwner === "string" && newOwner !== current.ownerId) {
          await notify({
            organizationId: ctx.organizationId,
            userIds: [newOwner],
            actorId: ctx.user.id,
            type: "record.assigned",
            title: `${ctx.user.name} vous a confié « ${recordTitle(input.entity, updated)} »`,
            url: recordUrl(input.entity, input.id),
          });
        }
        await publish(ctx.organizationId, {
          type: "record.changed",
          entity: input.entity,
          ids: [input.id],
          actorId: ctx.user.id,
        });
      }
      return serialize(input.entity, updated);
    }),

  /** Modification groupée (responsable, statut, étiquettes…). */
  bulkUpdate: orgProcedure
    .input(z.object({ entity: entitySchema, ids: idsSchema, values: valuesSchema }))
    .mutation(async ({ ctx, input }) => {
      const { fields, scopeWhere } = await entityContext(ctx, input.entity, "update");
      const allowed = fields.filter((f) => !isCustomKey(f.key));
      const parsed = parseRecordInput(allowed, input.values, "update");
      if (!parsed.success) invalid(parsed.errors);
      if (Object.keys(parsed.value.data).length === 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Aucune modification demandée." });
      await assertReferences(ctx, parsed.value.data);
      const result = await delegate(ctx, input.entity).updateMany({
        where: { id: { in: input.ids }, ...scopeWhere },
        data: parsed.value.data as never,
      });
      await recordAudit(ctx, {
        action: "record.bulk_update",
        entityType: input.entity,
        changes: Object.fromEntries(
          Object.entries(parsed.value.data).map(([k, v]) => [k, { before: null, after: v }]),
        ),
        metadata: { count: result.count, ids: input.ids.slice(0, 100) },
      });
      await publish(ctx.organizationId, {
        type: "record.changed",
        entity: input.entity,
        ids: input.ids,
        actorId: ctx.user.id,
      });
      return { count: result.count };
    }),

  /** Mise en corbeille (réversible 30 jours). */
  delete: orgProcedure
    .input(z.object({ entity: entitySchema, ids: idsSchema }))
    .mutation(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, input.entity, "delete");
      const result = await delegate(ctx, input.entity).updateMany({
        where: { id: { in: input.ids }, deletedAt: null, ...scopeWhere },
        data: { deletedAt: new Date() },
      });
      await recordAudit(ctx, {
        action: "record.delete",
        entityType: input.entity,
        metadata: { count: result.count, ids: input.ids.slice(0, 100) },
      });
      await publish(ctx.organizationId, {
        type: "record.changed",
        entity: input.entity,
        ids: input.ids,
        actorId: ctx.user.id,
      });
      return { count: result.count };
    }),

  restore: orgProcedure
    .input(z.object({ entity: entitySchema, ids: idsSchema }))
    .mutation(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, input.entity, "delete");
      const result = await delegate(ctx, input.entity).updateMany({
        where: { id: { in: input.ids }, deletedAt: { not: null }, ...scopeWhere },
        data: { deletedAt: null },
      });
      await recordAudit(ctx, {
        action: "record.restore",
        entityType: input.entity,
        metadata: { count: result.count, ids: input.ids.slice(0, 100) },
      });
      await publish(ctx.organizationId, {
        type: "record.changed",
        entity: input.entity,
        ids: input.ids,
        actorId: ctx.user.id,
      });
      return { count: result.count };
    }),

  /** Corbeille : éléments supprimés depuis moins de 30 jours. */
  trash: orgProcedure.input(z.object({ entity: entitySchema })).query(async ({ ctx, input }) => {
    const { scopeWhere } = await entityContext(ctx, input.entity, "delete");
    const rows = (await delegate(ctx, input.entity).findMany({
      where: { deletedAt: { not: null }, ...scopeWhere },
      orderBy: { deletedAt: "desc" },
      take: 500,
    })) as unknown as (Record<string, unknown> & { id: string; deletedAt: Date })[];
    return rows.map((r) => ({
      id: r.id,
      title: recordTitle(input.entity, r),
      deletedAt: r.deletedAt,
      purgeAt: new Date(r.deletedAt.getTime() + 30 * 86_400_000),
    }));
  }),

  /**
   * Import (lignes déjà associées aux champs par l'assistant). `dryRun` : validation seule,
   * avec les erreurs ligne par ligne. Les lignes invalides ne sont jamais importées.
   */
  import: orgProcedure
    .input(
      z.object({
        entity: entitySchema,
        rows: z.array(z.record(z.string(), z.string())).min(1).max(5000),
        dryRun: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { fields } = await entityContext(ctx, input.entity, "create");
      const importable: FieldDef[] = fields.filter((f) => f.editable);

      // Résolution des références par libellé : responsable par email, entreprise par nom.
      const members = await ctx.db.membership.findMany({
        select: { user: { select: { id: true, email: true, name: true } } },
      });
      const userByKey = new Map<string, string>();
      for (const m of members) {
        userByKey.set(m.user.email.toLowerCase(), m.user.id);
        userByKey.set(m.user.name.toLowerCase(), m.user.id);
      }
      const companyNames = [
        ...new Set(input.rows.map((r) => r.companyId?.trim().toLowerCase()).filter(Boolean)),
      ] as string[];
      const companies = companyNames.length
        ? await ctx.db.company.findMany({
            where: {
              OR: companyNames.map((n) => ({ name: { equals: n, mode: "insensitive" as const } })),
            },
            select: { id: true, name: true },
          })
        : [];
      const companyByName = new Map(companies.map((c) => [c.name.toLowerCase(), c.id]));

      const valid: { data: Record<string, unknown>; customFields: Record<string, unknown> }[] = [];
      const errors: { row: number; messages: string[] }[] = [];
      input.rows.forEach((raw, index) => {
        const values: Record<string, unknown> = { ...raw };
        const messages: string[] = [];
        if (raw.ownerId) {
          const id = userByKey.get(raw.ownerId.trim().toLowerCase());
          if (id) values.ownerId = id;
          else messages.push(`Responsable « ${raw.ownerId} » inconnu dans l'espace.`);
        }
        if (raw.companyId) {
          const id = companyByName.get(raw.companyId.trim().toLowerCase());
          if (id) values.companyId = id;
          else
            messages.push(
              `Entreprise « ${raw.companyId} » introuvable : importez d'abord les entreprises.`,
            );
        }
        const parsed = parseRecordInput(importable, values, "create");
        if (!parsed.success) messages.push(...Object.values(parsed.errors));
        if (messages.length > 0 || !parsed.success) errors.push({ row: index + 1, messages });
        else valid.push(parsed.value);
      });

      if (input.dryRun) return { valid: valid.length, errors, imported: 0 };

      let imported = 0;
      for (let i = 0; i < valid.length; i += 500) {
        const chunk = valid.slice(i, i + 500);
        const result = await delegate(ctx, input.entity).createMany({
          data: chunk.map((r) => ({
            ...r.data,
            ownerId: (r.data.ownerId as string | undefined) ?? ctx.user.id,
            organizationId: ctx.organizationId,
            customFields: r.customFields,
          })) as never,
        });
        imported += result.count;
      }
      await recordAudit(ctx, {
        action: "record.import",
        entityType: input.entity,
        metadata: { count: imported, rejected: errors.length },
      });
      await publish(ctx.organizationId, {
        type: "record.changed",
        entity: input.entity,
        ids: [],
        actorId: ctx.user.id,
      });
      return { valid: valid.length, errors, imported };
    }),

  /** Membres et entreprises proposés dans les listes de choix (responsable, entreprise). */
  options: orgProcedure
    .input(z.object({ kind: z.enum(["user", "company"]), search: z.string().max(80).optional() }))
    .query(async ({ ctx, input }) => {
      if (input.kind === "user") {
        const members = await ctx.db.membership.findMany({
          select: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { user: { name: "asc" } },
        });
        return members.map((m) => ({ value: m.user.id, label: m.user.name, hint: m.user.email }));
      }
      const { scopeWhere } = await entityContext(ctx, "company", "view");
      const companies = await ctx.db.company.findMany({
        where: {
          ...scopeWhere,
          ...(input.search ? { name: { contains: input.search, mode: "insensitive" } } : {}),
        },
        select: { id: true, name: true, city: true },
        orderBy: { name: "asc" },
        take: 50,
      });
      return companies.map((c) => ({ value: c.id, label: c.name, hint: c.city ?? undefined }));
    }),
});
