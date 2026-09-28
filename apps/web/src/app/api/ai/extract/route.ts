import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { aiConfigured } from "@/server/ai/client";
import {
  EXTRACTION_MAX_BYTES,
  EXTRACTION_TYPES,
  ExtractionError,
  type ExtractionMime,
  extractDocument,
} from "@/server/ai/extract";
import { aiRequestContext } from "@/server/ai/request";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isMime(value: string): value is ExtractionMime {
  return value in EXTRACTION_TYPES;
}

/** Lecture d'une facture fournisseur ou d'un justificatif (PDF, JPEG, PNG, WebP, GIF). */
export async function POST(request: Request) {
  const ctx = await aiRequestContext();
  if (!ctx) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (!aiConfigured())
    return NextResponse.json(
      { error: "L'assistant n'est pas configuré sur cette installation." },
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
  const conversationId = form?.get("conversationId");
  try {
    const result = await extractDocument({
      workspace: ctx.workspace,
      userId: ctx.user.id,
      conversationId: typeof conversationId === "string" && conversationId ? conversationId : null,
      fileName: file.name.slice(0, 200) || "document",
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
          msg: "ai.extract",
          status: error.status,
          error: error.message,
        }),
      );
      return NextResponse.json(
        { error: "Le service de l'assistant est indisponible. Réessayez dans quelques instants." },
        { status: 502 },
      );
    }
    throw error;
  }
}
