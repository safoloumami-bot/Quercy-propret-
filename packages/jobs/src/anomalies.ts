import { anomalyTypeLabel, grantedScope, type PermissionMatrix } from "@quercy/core";
import { prisma } from "@quercy/db";

import { recordInterventionEvents } from "./events";

export interface AnomalyInput {
  organizationId: string;
  type: string;
  source: "agent" | "system" | "inspection" | "client";
  siteId?: string | null;
  interventionId?: string | null;
  location?: string | null;
  comment?: string | null;
  photoFileId?: string | null;
  severity?: string;
  reportedById?: string | null;
  /** Une anomalie portant la même clé n'est jamais créée deux fois. */
  dedupeKey?: string | null;
}

export interface ReportedAnomaly {
  id: string;
  organizationId: string;
  type: string;
  created: boolean;
  /** Responsables prévenus. */
  notified: string[];
}

/**
 * Responsables du module Nettoyage : droit de modification sur tout le module ou sur leur
 * équipe. Ce sont eux (chef, patron) qui reçoivent les anomalies, jamais le client.
 */
export async function cleaningManagerIds(organizationId: string): Promise<string[]> {
  const members = await prisma.membership.findMany({
    where: { organizationId, deletedAt: null },
    select: { userId: true, role: { select: { permissions: true } } },
  });
  return members
    .filter((m) => {
      const scope = grantedScope(m.role.permissions as PermissionMatrix, "cleaning", "update");
      return scope === "all" || scope === "team";
    })
    .map((m) => m.userId);
}

/**
 * Enregistre des anomalies (statut « à valider »), les inscrit au journal de l'intervention
 * et prévient les responsables dans l'application. Sans doublon grâce à `dedupeKey`.
 */
export async function reportAnomalies(inputs: AnomalyInput[]): Promise<ReportedAnomaly[]> {
  const results: ReportedAnomaly[] = [];
  const managersOf = new Map<string, string[]>();
  for (const input of inputs) {
    if (input.dedupeKey) {
      const existing = await prisma.anomaly.findFirst({
        where: { organizationId: input.organizationId, dedupeKey: input.dedupeKey },
        select: { id: true },
      });
      if (existing) {
        results.push({
          ...existing,
          organizationId: input.organizationId,
          type: input.type,
          created: false,
          notified: [],
        });
        continue;
      }
    }
    let anomaly: { id: string; site: { name: string } | null };
    try {
      anomaly = await prisma.anomaly.create({
        data: {
          organizationId: input.organizationId,
          type: input.type,
          source: input.source,
          siteId: input.siteId ?? null,
          interventionId: input.interventionId ?? null,
          location: input.location?.trim() || null,
          comment: input.comment?.trim() || null,
          photoFileId: input.photoFileId ?? null,
          severity: input.severity ?? "normal",
          reportedById: input.reportedById ?? null,
          dedupeKey: input.dedupeKey ?? null,
        },
        select: { id: true, site: { select: { name: true } } },
      });
    } catch (error) {
      // Course entre deux envois de la même anomalie : la clé unique a joué son rôle.
      if ((error as { code?: string }).code === "P2002" && input.dedupeKey) {
        const existing = await prisma.anomaly.findFirstOrThrow({
          where: { organizationId: input.organizationId, dedupeKey: input.dedupeKey },
          select: { id: true },
        });
        results.push({
          ...existing,
          organizationId: input.organizationId,
          type: input.type,
          created: false,
          notified: [],
        });
        continue;
      }
      throw error;
    }
    if (input.interventionId)
      await recordInterventionEvents([
        {
          organizationId: input.organizationId,
          interventionId: input.interventionId,
          userId: input.reportedById ?? null,
          type: "anomaly_reported",
          metadata: {
            anomalyId: anomaly.id,
            anomalyType: input.type,
            source: input.source,
            label: "Anomalie signalée",
            detail: [anomalyTypeLabel(input.type), input.location].filter(Boolean).join(" — "),
          },
        },
      ]);
    if (!managersOf.has(input.organizationId))
      managersOf.set(input.organizationId, await cleaningManagerIds(input.organizationId));
    const recipients = managersOf
      .get(input.organizationId)!
      .filter((id) => id !== input.reportedById);
    if (recipients.length)
      await prisma.notification.createMany({
        data: recipients.map((userId) => ({
          organizationId: input.organizationId,
          userId,
          actorId: input.reportedById ?? null,
          type: "anomaly.reported",
          title: `Anomalie à valider : ${anomalyTypeLabel(input.type)}`,
          body:
            [anomaly.site?.name, input.location, input.comment]
              .filter((s) => s && s.trim())
              .join(" — ") || null,
          url: `/nettoyage/anomalies?id=${anomaly.id}`,
        })),
      });
    results.push({
      id: anomaly.id,
      organizationId: input.organizationId,
      type: input.type,
      created: true,
      notified: recipients,
    });
  }
  return results;
}
