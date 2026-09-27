import "server-only";

import type { TenantClient } from "@quercy/db";
import { prisma } from "@quercy/db";
import { strToU8, zipSync } from "fflate";

type Row = Record<string, unknown>;

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const BOM = "\uFEFF";

/** CSV au format européen (séparateur « ; », BOM UTF-8 pour Excel). */
export function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "﻿";
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [headers.join(";"), ...rows.map((r) => headers.map((h) => cell(r[h])).join(";"))];
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

/**
 * Export complet des données d'un espace (portabilité RGPD) : un fichier JSON unique et un
 * CSV par table, dans une archive ZIP. Les secrets (mots de passe, jetons) ne sont jamais exportés.
 */
export async function buildWorkspaceExport(
  db: TenantClient,
  organizationId: string,
): Promise<Uint8Array> {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  const [memberships, roles, teams, invitations, auditLog, customFields, savedViews] =
    await Promise.all([
      db.membership.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          role: { select: { name: true } },
        },
      }),
      db.role.findMany(),
      db.team.findMany({ include: { members: { select: { userId: true } } } }),
      db.invitation.findMany({
        select: {
          id: true,
          email: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          roleId: true,
        },
      }),
      db.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
      db.customFieldDefinition.findMany(),
      db.savedView.findMany(),
    ]);

  const tables: Record<string, Row[]> = {
    espace: [organization],
    membres: memberships.map((m) => ({
      id: m.id,
      userId: m.user.id,
      nom: m.user.name,
      email: m.user.email,
      role: m.role.name,
      arrivee: m.createdAt,
    })),
    roles: roles,
    equipes: teams.map((t) => ({ ...t, members: t.members.map((m) => m.userId) })),
    invitations,
    journal_audit: auditLog,
    champs_personnalises: customFields,
    vues_enregistrees: savedViews,
  };

  const files: Record<string, Uint8Array> = {
    "donnees.json": strToU8(
      JSON.stringify({ exportedAt: new Date().toISOString(), ...tables }, null, 2),
    ),
    "LISEZMOI.txt": strToU8(
      "Export complet de votre espace Quercy.\n\n- donnees.json : toutes les données, structurées.\n- csv/ : un fichier par table (séparateur « ; », encodage UTF-8).\n",
    ),
  };
  for (const [name, rows] of Object.entries(tables))
    files[`csv/${name}.csv`] = strToU8(toCsv(rows));
  return zipSync(files, { level: 6 });
}
