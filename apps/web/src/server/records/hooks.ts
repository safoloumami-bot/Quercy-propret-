import "server-only";

import { type EntityKey, stageProbability } from "@quercy/core";
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
