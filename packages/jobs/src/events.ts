import type { InterventionEventType } from "@quercy/core";
import { type Prisma, prisma } from "@quercy/db";

export interface InterventionEventInput {
  organizationId: string;
  interventionId: string;
  type: InterventionEventType;
  userId?: string | null;
  at?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Inscrit des évènements au journal des interventions (08:04 démarrée, 08:42 photo…).
 * Le journal ne doit jamais faire échouer l'action de la personne : une erreur est consignée.
 */
export async function recordInterventionEvents(events: InterventionEventInput[]): Promise<void> {
  if (events.length === 0) return;
  try {
    await prisma.interventionEvent.createMany({
      data: events.map((e) => ({
        organizationId: e.organizationId,
        interventionId: e.interventionId,
        type: e.type,
        userId: e.userId ?? null,
        at: e.at ?? new Date(),
        metadata: (e.metadata ?? {}) as Prisma.InputJsonValue,
      })),
    });
  } catch (error) {
    console.error(
      JSON.stringify({ level: "error", msg: "intervention_event.failed", error: String(error) }),
    );
  }
}

export const recordInterventionEvent = (event: InterventionEventInput) =>
  recordInterventionEvents([event]);
