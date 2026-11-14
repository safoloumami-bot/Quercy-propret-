import { PLANS } from "@quercy/core";
import { NextResponse } from "next/server";

import {
  canAccessRecord,
  fileRequestContext,
  isEntityKey,
  storageUsage,
} from "@/server/files/access";
import { publish } from "@/server/realtime";
import { StorageUnavailableError } from "@quercy/storage";

import { checkFile, newStorageKey, putObject, signedFileUrl } from "@/server/storage";

export const dynamic = "force-dynamic";

/** Envoi d'une pièce jointe (multipart : file, entity, entityId). */
export async function POST(request: Request) {
  const ctx = await fileRequestContext();
  if (!ctx)
    return NextResponse.json({ error: "Session expirée : reconnectez-vous." }, { status: 401 });
  if (ctx.workspace.billing.readOnly) {
    return NextResponse.json(
      { error: "L'espace est en lecture seule : aucun fichier ne peut être ajouté." },
      { status: 403 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const entity = String(form?.get("entity") ?? "");
  const entityId = String(form?.get("entityId") ?? "");
  if (!(file instanceof File) || !isEntityKey(entity) || !entityId) {
    return NextResponse.json({ error: "Envoi incomplet." }, { status: 400 });
  }
  if (!(await canAccessRecord(ctx, entity, entityId, "update"))) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas ajouter de fichier à cette fiche." },
      { status: 403 },
    );
  }
  const problem = checkFile(file.name, file.type, file.size);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const { used, quota } = await storageUsage(
    ctx.organizationId,
    ctx.workspace.billing.effectivePlan,
    ctx.workspace.billing.memberCount,
  );
  if (used + file.size > quota) {
    return NextResponse.json(
      {
        error: `Espace de stockage de l'offre ${PLANS[ctx.workspace.billing.effectivePlan].name} plein. Supprimez des fichiers ou passez à l'offre supérieure.`,
        planLimit: true,
      },
      { status: 403 },
    );
  }

  const key = newStorageKey(ctx.organizationId, file.name);
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
      name: file.name.slice(0, 200),
      mimeType: file.type,
      size: file.size,
      uploadedById: ctx.user.id,
      entityType: entity,
      entityId,
    },
  });
  await ctx.db.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorId: ctx.user.id,
      action: "file.upload",
      entityType: entity,
      entityId,
      metadata: { name: stored.name, size: stored.size },
    },
  });
  await publish(ctx.organizationId, {
    type: "record.changed",
    entity,
    ids: [entityId],
    actorId: ctx.user.id,
  });
  return NextResponse.json({ id: stored.id, name: stored.name, url: await signedFileUrl(stored) });
}
