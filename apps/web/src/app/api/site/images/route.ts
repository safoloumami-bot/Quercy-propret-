import { PLANS, can } from "@quercy/core";
import { StorageUnavailableError } from "@quercy/storage";
import { NextResponse } from "next/server";

import { fileRequestContext, storageUsage } from "@/server/files/access";
import { newStorageKey, putObject, signedFileUrl } from "@/server/storage";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

/** Photo du site web (multipart : file). Redimensionnée dans le navigateur avant l'envoi. */
export async function POST(request: Request) {
  const ctx = await fileRequestContext();
  if (!ctx)
    return NextResponse.json({ error: "Session expirée : reconnectez-vous." }, { status: 401 });
  if (!ctx.workspace.organization.modules.includes("website"))
    return NextResponse.json(
      { error: "Le module « Site web » n'est pas activé." },
      { status: 403 },
    );
  if (ctx.workspace.billing.readOnly || !can(ctx.workspace.role.permissions, "website", "update"))
    return NextResponse.json({ error: "Vous ne pouvez pas modifier le site." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Envoi incomplet." }, { status: 400 });
  if (!IMAGE_TYPES.has(file.type))
    return NextResponse.json({ error: "Choisissez une photo JPEG, PNG ou WebP." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "Photo trop lourde (8 Mo au plus)." }, { status: 400 });

  const site = await ctx.db.website.findFirst({ select: { id: true } });
  if (!site) return NextResponse.json({ error: "Créez d'abord le site." }, { status: 400 });

  const { used, quota } = await storageUsage(
    ctx.organizationId,
    ctx.workspace.billing.effectivePlan,
    ctx.workspace.billing.memberCount,
  );
  if (used + file.size > quota)
    return NextResponse.json(
      {
        error: `Espace de stockage de l'offre ${PLANS[ctx.workspace.billing.effectivePlan].name} plein.`,
        planLimit: true,
      },
      { status: 403 },
    );

  const key = newStorageKey(ctx.organizationId, file.name || "photo.jpg");
  try {
    await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type);
  } catch (error) {
    if (error instanceof StorageUnavailableError)
      return NextResponse.json({ error: error.message }, { status: 503 });
    throw error;
  }
  const stored = await ctx.db.storedFile.create({
    data: {
      organizationId: ctx.organizationId,
      storageKey: key,
      name: (file.name || "photo.jpg").slice(0, 200),
      mimeType: file.type,
      size: file.size,
      uploadedById: ctx.user.id,
      entityType: "website",
      entityId: site.id,
    },
  });
  return NextResponse.json({ fileId: stored.id, url: await signedFileUrl(stored) });
}
