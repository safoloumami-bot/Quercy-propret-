import { recordTitle } from "@quercy/core";
import { type Prisma, prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publish } from "../../realtime";
import { entityContext, type RecordsCtx } from "../../records/context";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";

const entitySchema = z.enum(["company", "contact"]);
type DuplicateEntity = z.infer<typeof entitySchema>;

interface Pair {
  firstId: string;
  secondId: string;
  score: number;
  reasons: string[];
}

/** La fusion touche toutes les fiches liées : réservée aux personnes qui voient tout le CRM. */
async function requireFullAccess(ctx: RecordsCtx, entity: DuplicateEntity) {
  const { scope } = await entityContext(ctx, entity, "update");
  const del = await entityContext(ctx, entity, "delete");
  if (scope !== "all" || del.scope !== "all")
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "La gestion des doublons est réservée aux personnes ayant accès à toutes les fiches.",
    });
}

/**
 * Paires suspectes : noms proches (similarité trigramme ≥ 0,55 pour les entreprises, ≥ 0,7
 * pour les contacts), même SIREN ou même email. Les paires écartées ne reviennent pas.
 */
async function findPairs(organizationId: string, entity: DuplicateEntity): Promise<Pair[]> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('pg_trgm.similarity_threshold', '0.45', true)`;
    if (entity === "company") {
      const rows = await tx.$queryRaw<
        {
          firstId: string;
          secondId: string;
          score: number;
          sameSiren: boolean;
          sameEmail: boolean;
        }[]
      >`
        SELECT a.id AS "firstId", b.id AS "secondId",
               similarity(lower(a.name), lower(b.name))::float AS score,
               (a.siren IS NOT NULL AND a.siren <> '' AND a.siren = b.siren) AS "sameSiren",
               (a.email IS NOT NULL AND lower(a.email) = lower(b.email)) AS "sameEmail"
        FROM company a
        JOIN company b ON b."organizationId" = a."organizationId" AND a.id < b.id
        WHERE a."organizationId" = ${organizationId}
          AND a."deletedAt" IS NULL AND b."deletedAt" IS NULL
          AND (a.name % b.name
               OR (a.siren IS NOT NULL AND a.siren <> '' AND a.siren = b.siren)
               OR (a.email IS NOT NULL AND lower(a.email) = lower(b.email)))
          AND NOT EXISTS (
            SELECT 1 FROM duplicate_dismissal d
            WHERE d."organizationId" = a."organizationId" AND d."entityType" = 'company'
              AND d."firstId" = a.id AND d."secondId" = b.id)
        ORDER BY score DESC
        LIMIT 200`;
      return rows
        .filter((r) => r.sameSiren || r.sameEmail || r.score >= 0.55)
        .slice(0, 50)
        .map((r) => ({
          firstId: r.firstId,
          secondId: r.secondId,
          score: r.sameSiren || r.sameEmail ? Math.max(r.score, 0.95) : r.score,
          reasons: [
            ...(r.score >= 0.55 ? ["Noms très proches"] : []),
            ...(r.sameSiren ? ["Même SIREN"] : []),
            ...(r.sameEmail ? ["Même email"] : []),
          ],
        }));
    }
    const rows = await tx.$queryRaw<
      {
        firstId: string;
        secondId: string;
        score: number;
        sameEmail: boolean;
        sameCompany: boolean;
      }[]
    >`
      SELECT a.id AS "firstId", b.id AS "secondId",
             similarity(lower(coalesce(a."firstName", '') || ' ' || a."lastName"),
                        lower(coalesce(b."firstName", '') || ' ' || b."lastName"))::float AS score,
             (a.email IS NOT NULL AND lower(a.email) = lower(b.email)) AS "sameEmail",
             (a."companyId" IS NOT NULL AND a."companyId" = b."companyId") AS "sameCompany"
      FROM contact a
      JOIN contact b ON b."organizationId" = a."organizationId" AND a.id < b.id
      WHERE a."organizationId" = ${organizationId}
        AND a."deletedAt" IS NULL AND b."deletedAt" IS NULL
        AND (a."lastName" % b."lastName" OR (a.email IS NOT NULL AND lower(a.email) = lower(b.email)))
        AND NOT EXISTS (
          SELECT 1 FROM duplicate_dismissal d
          WHERE d."organizationId" = a."organizationId" AND d."entityType" = 'contact'
            AND d."firstId" = a.id AND d."secondId" = b.id)
      ORDER BY score DESC
      LIMIT 200`;
    return rows
      .filter((r) => r.sameEmail || r.score >= 0.7)
      .slice(0, 50)
      .map((r) => ({
        firstId: r.firstId,
        secondId: r.secondId,
        score: r.sameEmail ? Math.max(r.score, 0.95) : r.score,
        reasons: [
          ...(r.score >= 0.7 ? ["Noms très proches"] : []),
          ...(r.sameEmail ? ["Même email"] : []),
          ...(r.sameCompany ? ["Même entreprise"] : []),
        ],
      }));
  });
}

const SUMMARY: Record<DuplicateEntity, string[]> = {
  company: ["email", "phone", "city", "siren", "website"],
  contact: ["email", "phone", "jobTitle"],
};

/** Complète la fiche conservée avec les valeurs absentes de la fiche fusionnée. */
export function mergeValues(
  keep: Record<string, unknown>,
  merged: Record<string, unknown>,
  columns: string[],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const column of columns) {
    const current = keep[column];
    const other = merged[column];
    if (
      (current === null || current === undefined || current === "") &&
      other !== null &&
      other !== undefined &&
      other !== ""
    )
      data[column] = other;
  }
  const tags = [
    ...new Set([...((keep.tags as string[]) ?? []), ...((merged.tags as string[]) ?? [])]),
  ];
  if (tags.length !== ((keep.tags as string[]) ?? []).length) data.tags = tags;
  data.customFields = {
    ...((merged.customFields as Record<string, unknown>) ?? {}),
    ...((keep.customFields as Record<string, unknown>) ?? {}),
  };
  return data;
}

const MERGE_COLUMNS: Record<DuplicateEntity, string[]> = {
  company: [
    "type",
    "email",
    "phone",
    "website",
    "address",
    "postalCode",
    "city",
    "country",
    "siren",
    "vatNumber",
    "annualRevenue",
    "employees",
    "ownerId",
  ],
  contact: [
    "firstName",
    "companyId",
    "jobTitle",
    "email",
    "phone",
    "status",
    "score",
    "source",
    "ownerId",
  ],
};

export const crmRouter = createTRPCRouter({
  duplicates: orgProcedure
    .input(z.object({ entity: entitySchema }))
    .query(async ({ ctx, input }) => {
      await requireFullAccess(ctx, input.entity);
      const pairs = await findPairs(ctx.organizationId, input.entity);
      const ids = [...new Set(pairs.flatMap((p) => [p.firstId, p.secondId]))];
      const records = (await (input.entity === "company"
        ? ctx.db.company.findMany({ where: { id: { in: ids } } })
        : ctx.db.contact.findMany({
            where: { id: { in: ids } },
            include: { company: { select: { name: true } } },
          }))) as unknown as (Record<string, unknown> & { id: string; updatedAt: Date })[];
      const byId = new Map(records.map((r) => [r.id, r]));
      const card = (id: string) => {
        const r = byId.get(id)!;
        return {
          id,
          title: recordTitle(input.entity, r),
          details: [
            ...SUMMARY[input.entity]
              .map((k) => r[k])
              .filter((v): v is string => typeof v === "string" && v !== ""),
            ...(input.entity === "contact" && (r.company as { name?: string } | null)?.name
              ? [(r.company as { name: string }).name]
              : []),
          ],
          updatedAt: r.updatedAt,
        };
      };
      return pairs
        .filter((p) => byId.has(p.firstId) && byId.has(p.secondId))
        .map((p) => ({ ...p, first: card(p.firstId), second: card(p.secondId) }));
    }),

  /** « Ce ne sont pas des doublons » : la paire est exclue des prochaines détections. */
  dismiss: orgProcedure
    .input(z.object({ entity: entitySchema, ids: z.tuple([z.string().min(1), z.string().min(1)]) }))
    .mutation(async ({ ctx, input }) => {
      await requireFullAccess(ctx, input.entity);
      const [firstId, secondId] = [...input.ids].sort() as [string, string];
      await ctx.db.duplicateDismissal.upsert({
        where: {
          organizationId_entityType_firstId_secondId: {
            organizationId: ctx.organizationId,
            entityType: input.entity,
            firstId,
            secondId,
          },
        },
        create: { organizationId: ctx.organizationId, entityType: input.entity, firstId, secondId },
        update: {},
      });
      return { ok: true };
    }),

  /**
   * Fusion : la fiche conservée récupère les valeurs manquantes, les étiquettes, les fiches liées,
   * les commentaires et les fichiers ; l'autre part à la corbeille (restaurable 30 jours).
   */
  merge: orgProcedure
    .input(
      z.object({ entity: entitySchema, keepId: z.string().min(1), mergeId: z.string().min(1) }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireFullAccess(ctx, input.entity);
      if (input.keepId === input.mergeId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choisissez deux fiches différentes.",
        });
      const org = ctx.organizationId;
      const result = await prisma.$transaction(async (tx) => {
        const load = (id: string) =>
          (input.entity === "company"
            ? tx.company.findFirst({ where: { id, organizationId: org, deletedAt: null } })
            : tx.contact.findFirst({
                where: { id, organizationId: org, deletedAt: null },
              })) as Promise<(Record<string, unknown> & { id: string }) | null>;
        const [keep, merged] = await Promise.all([load(input.keepId), load(input.mergeId)]);
        if (!keep || !merged)
          throw new TRPCError({ code: "NOT_FOUND", message: "Une des fiches n'existe plus." });
        const data = mergeValues(
          keep,
          merged,
          MERGE_COLUMNS[input.entity],
        ) as Prisma.CompanyUpdateInput;
        const where = { organizationId: org };
        const moved: Record<string, number> = {};
        if (input.entity === "company") {
          await tx.company.update({ where: { id: keep.id }, data });
          const target = { companyId: keep.id };
          const from = { ...where, companyId: merged.id };
          moved.contacts = (await tx.contact.updateMany({ where: from, data: target })).count;
          moved.deals = (await tx.deal.updateMany({ where: from, data: target })).count;
          moved.activities = (await tx.activity.updateMany({ where: from, data: target })).count;
          moved.documents = (
            await tx.salesDocument.updateMany({ where: from, data: target })
          ).count;
          moved.projects = (await tx.project.updateMany({ where: from, data: target })).count;
          await tx.company.update({ where: { id: merged.id }, data: { deletedAt: new Date() } });
        } else {
          await tx.contact.update({
            where: { id: keep.id },
            data: data as Prisma.ContactUpdateInput,
          });
          const target = { contactId: keep.id };
          const from = { ...where, contactId: merged.id };
          moved.deals = (await tx.deal.updateMany({ where: from, data: target })).count;
          moved.activities = (await tx.activity.updateMany({ where: from, data: target })).count;
          moved.documents = (
            await tx.salesDocument.updateMany({ where: from, data: target })
          ).count;
          await tx.contact.update({ where: { id: merged.id }, data: { deletedAt: new Date() } });
        }
        const attached = { ...where, entityType: input.entity, entityId: merged.id };
        moved.comments = (
          await tx.comment.updateMany({ where: attached, data: { entityId: keep.id } })
        ).count;
        moved.files = (
          await tx.storedFile.updateMany({ where: attached, data: { entityId: keep.id } })
        ).count;
        return { keep, merged, moved };
      });
      await recordAudit(ctx, {
        action: "crm.merge",
        entityType: input.entity,
        entityId: input.keepId,
        metadata: {
          name: recordTitle(input.entity, result.keep),
          merged: { id: input.mergeId, name: recordTitle(input.entity, result.merged) },
          moved: result.moved,
        },
      });
      await publish(ctx.organizationId, {
        type: "record.changed",
        entity: input.entity,
        ids: [input.keepId, input.mergeId],
        actorId: ctx.user.id,
      });
      return { moved: result.moved };
    }),
});
