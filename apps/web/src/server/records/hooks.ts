import "server-only";

import {
  type EntityKey,
  INSPECTION_CHECKS,
  inspectionOutcome,
  stageProbability,
} from "@quercy/core";
import { TRPCError } from "@trpc/server";

/** Champs encore modifiables sur une facture ou un avoir émis (document légalement figé). */
const ISSUED_EDITABLE = new Set(["ownerId", "tags", "customFields", "dueDate"]);

/** Vrai si le document est émis et ne peut plus être modifié (hors champs internes). */
export function isLockedDocument(entity: EntityKey, record: Record<string, unknown>): boolean {
  return (entity === "invoice" || entity === "creditNote") && record.status !== "draft";
}

/**
 * Règles métier appliquées avant l'écriture d'un enregistrement (création, modification,
 * modification groupée). `current` est absent à la création et pour les modifications groupées.
 */
export function applyBusinessRules(
  entity: EntityKey,
  data: Record<string, unknown>,
  current?: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...data };
  const now = new Date();

  if (current && isLockedDocument(entity, current)) {
    const forbidden = Object.keys(next).filter((k) => !ISSUED_EDITABLE.has(k));
    if (forbidden.length > 0)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Un document émis ne peut plus être modifié : établissez un avoir pour le corriger.",
      });
  }

  switch (entity) {
    case "rental": {
      const start = (next.startDate ?? current?.startDate) as Date | undefined;
      const end = (next.endDate ?? current?.endDate) as Date | undefined;
      if (start && end && end < start)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La fin de location précède son début.",
        });
      // Sortie et retour datés au moment où l'état change.
      if (next.status === "out" && current?.status !== "out") next.outAt = now;
      if (next.status === "returned" && current?.status !== "returned") next.returnedAt = now;
      break;
    }
    case "deal": {
      if (typeof next.stage === "string") {
        // La probabilité suit l'étape, sauf si elle est saisie en même temps.
        if (!("probability" in data)) next.probability = stageProbability(next.stage);
        if (next.stage === "won" || next.stage === "lost") {
          if (!current || (current.stage !== "won" && current.stage !== "lost"))
            next.closedAt = now;
        } else next.closedAt = null;
      }
      break;
    }
    case "task": {
      if (typeof next.status === "string") {
        next.completedAt =
          next.status === "done" ? (current?.status === "done" ? current.completedAt : now) : null;
      }
      break;
    }
    case "activity": {
      if (typeof next.done === "boolean")
        next.completedAt = next.done ? (current?.done ? current.completedAt : now) : null;
      break;
    }
    case "bill": {
      if (typeof next.status === "string")
        next.paidAt =
          next.status === "paid" ? (current?.status === "paid" ? current.paidAt : now) : null;
      break;
    }
    case "ticket": {
      if (typeof next.status === "string") {
        const solved = (s: unknown) => s === "resolved" || s === "closed";
        next.resolvedAt = solved(next.status)
          ? solved(current?.status)
            ? current!.resolvedAt
            : now
          : null;
      }
      break;
    }
    case "leave": {
      // Jours ouvrés calculés à la création si non saisis.
      if (
        !current &&
        next.days == null &&
        next.startDate instanceof Date &&
        next.endDate instanceof Date
      )
        next.days = workingDays(next.startDate, next.endDate);
      if (
        next.startDate instanceof Date &&
        next.endDate instanceof Date &&
        next.endDate < next.startDate
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La fin de l'absence précède son début.",
        });
      break;
    }
    case "intervention": {
      const merged = { ...current, ...next };
      const inAt = merged.checkInAt instanceof Date ? merged.checkInAt : null;
      const outAt = merged.checkOutAt instanceof Date ? merged.checkOutAt : null;
      if ("checkInAt" in next || "checkOutAt" in next) {
        if (inAt && outAt && outAt < inAt)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Le départ précède l'arrivée." });
        next.workedMinutes =
          inAt && outAt ? Math.round((outAt.getTime() - inAt.getTime()) / 60_000) : null;
        // Le pointage fait avancer le statut, sauf choix explicite dans la même saisie.
        if (
          !("status" in data) &&
          ["planned", "in_progress", "missed"].includes(String(merged.status))
        )
          next.status = outAt ? "done" : inAt ? "in_progress" : merged.status;
      }
      // Un supplément proposé (ou modifié) attend la validation du chef avant facturation.
      if ("extraPriceCents" in next) {
        if (current?.invoiceId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Passage déjà facturé : le supplément ne se modifie plus.",
          });
        if (next.extraPriceCents !== current?.extraPriceCents)
          next.extraStatus = next.extraPriceCents ? "pending" : null;
      }
      break;
    }
    case "inspection": {
      const touched = !current || INSPECTION_CHECKS.some((c) => c.key in next);
      if (touched) {
        const merged = { ...current, ...next };
        Object.assign(
          next,
          inspectionOutcome(INSPECTION_CHECKS.map((c) => merged[c.key] === true)),
        );
      }
      break;
    }
    case "timeEntry": {
      // Une saisie manuelle de durée arrête un éventuel chronomètre.
      if (typeof next.minutes === "number") next.startedAt = null;
      break;
    }
  }
  return next;
}

/** Suppression : les factures et avoirs émis sont conservés (obligation légale). */
export function deletableWhere(entity: EntityKey): Record<string, unknown> {
  return entity === "invoice" || entity === "creditNote" ? { status: "draft" } : {};
}

/** Champs autorisés en modification groupée. */
export function bulkEditable(entity: EntityKey, key: string): boolean {
  if (entity === "invoice" || entity === "creditNote") return key === "ownerId" || key === "tags";
  return true;
}

/** Jours ouvrés (lundi à vendredi) entre deux dates incluses. */
export function workingDays(start: Date, end: Date): number {
  let days = 0;
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  while (d.getTime() <= last) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) days++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}
