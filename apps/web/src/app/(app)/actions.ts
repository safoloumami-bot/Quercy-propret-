"use server";

import { can, hexColorSchema, organizationPreferencesSchema } from "@quercy/core";
import { prisma } from "@quercy/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { ACTIVE_ORG_COOKIE, requireWorkspaceContext } from "@/lib/workspace";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Bascule vers un autre espace dont l'utilisateur est membre. */
export async function switchWorkspace(organizationId: string): Promise<ActionResult> {
  const id = z.string().min(1).safeParse(organizationId);
  if (!id.success) return { ok: false, error: "Espace invalide." };

  const context = await requireWorkspaceContext();
  if (!context.workspaces.some((w) => w.id === id.data)) {
    return { ok: false, error: "Vous n'êtes pas membre de cet espace." };
  }

  (await cookies()).set(ACTIVE_ORG_COOKIE, id.data, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Change la couleur d'accent de l'espace (droit « modifier » sur les réglages). */
export async function updateAccentColor(color: string): Promise<ActionResult> {
  const parsed = hexColorSchema.safeParse(color);
  if (!parsed.success) {
    return { ok: false, error: "Choisissez une couleur au format #RRGGBB." };
  }

  const context = await requireWorkspaceContext();
  if (!can(context.role.permissions, "settings", "update")) {
    return {
      ok: false,
      error: "Seuls les administrateurs peuvent modifier l'apparence de l'espace.",
    };
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: context.organization.id },
    select: { preferences: true },
  });
  const current = organizationPreferencesSchema.parse(org.preferences ?? {});
  const next = { ...current, accentColor: parsed.data.toUpperCase() };
  if (next.accentColor === current.accentColor) return { ok: true };

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: context.organization.id },
      data: { preferences: next },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorId: context.user.id,
        action: "organization.preferences.update",
        entityType: "organization",
        entityId: context.organization.id,
        changes: { accentColor: { before: current.accentColor, after: next.accentColor } },
      },
    }),
  ]);

  revalidatePath("/", "layout");
  return { ok: true };
}
