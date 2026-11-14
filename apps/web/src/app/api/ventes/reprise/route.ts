import Anthropic from "@anthropic-ai/sdk";
import { grantedScope } from "@quercy/core";
import { NextResponse } from "next/server";

import { aiConfigured } from "@/server/ai/client";
import {
  EXTRACTION_MAX_BYTES,
  EXTRACTION_TYPES,
  ExtractionError,
  type ExtractionMime,
} from "@/server/ai/extract";
import { extractSalesDocument } from "@/server/ai/extract-sales";
import { aiRequestContext } from "@/server/ai/request";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isMime(value: string): value is ExtractionMime {
  return value in EXTRACTION_TYPES;
}

/**
 * Reprise d'historique : lit une facture, un avoir ou un devis émis (PDF ou photo) et renvoie
 * ses données. Rien n'est enregistré ici : la personne vérifie l'aperçu avant l'import.
 */
export async function POST(request: Request) {
  const ctx = await aiRequestContext();
  if (!ctx) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (!ctx.workspace.organization.modules.includes("sales"))
    return NextResponse.json({ error: "Le module Ventes n'est pas activé." }, { status: 403 });
  if (!grantedScope(ctx.workspace.role.permissions, "sales", "create"))
    return NextResponse.json(
      { error: "Votre rôle ne permet pas de créer des documents de vente." },
      { status: 403 },
    );
  if (ctx.workspace.billing.readOnly)
    return NextResponse.json({ error: "Espace en lecture seule." }, { status: 402 });
  if (!aiConfigured())
    return NextResponse.json(
      {
        error:
          "La lecture des PDF n'est pas disponible sur cette installation : utilisez un CSV ou un fichier Excel.",
      },
      { status: 503 },
    );
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (!isMime(file.type))
    return NextResponse.json(
      { error: "Format non pris en charge : PDF, JPEG, PNG, WebP ou GIF." },
      { status: 415 },
    );
  if (file.size > EXTRACTION_MAX_BYTES)
    return NextResponse.json(
      { error: "Fichier trop volumineux (10 Mo au plus)." },
      { status: 413 },
    );
  try {
    const result = await extractSalesDocument({
      workspace: ctx.workspace,
      userId: ctx.user.id,
      mime: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ExtractionError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Anthropic.APIError) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "ventes.reprise",
          status: error.status,
          error: error.message,
        }),
      );
      return NextResponse.json(
        { error: "Le service de lecture est indisponible. Réessayez dans quelques instants." },
        { status: 502 },
      );
    }
    throw error;
  }
}
