import { can, slugify } from "@quercy/core";
import { forTenant, prisma } from "@quercy/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { buildWorkspaceExport } from "@/server/export";
import { resolveWorkspace } from "@/server/workspace";

export const dynamic = "force-dynamic";

/** Téléchargement de l'export complet de l'espace actif (administrateurs uniquement). */
export async function GET() {
  const requestHeaders = await headers();
  const session = await auth().api.getSession({ headers: requestHeaders });
  if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const workspace = await resolveWorkspace(
    session.user.id,
    (session.session as { activeOrganizationId?: string | null }).activeOrganizationId,
  );
  if (!workspace || !can(workspace.role.permissions, "settings", "admin")) {
    return NextResponse.json(
      { error: "Export réservé aux administrateurs de l'espace." },
      { status: 403 },
    );
  }

  const organizationId = workspace.organization.id;
  const archive = await buildWorkspaceExport(forTenant(organizationId), organizationId);
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorId: session.user.id,
      action: "organization.export",
      entityType: "organization",
      entityId: organizationId,
      ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="quercy-${slugify(workspace.organization.name)}-${date}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
