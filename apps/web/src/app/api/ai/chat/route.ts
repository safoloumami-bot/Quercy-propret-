import { aiScreenContextSchema } from "@quercy/core";
import { NextResponse } from "next/server";
import { z } from "zod";

import type { AiStreamEvent } from "@/lib/ai-types";
import { runChat } from "@/server/ai/chat";
import { aiConfigured } from "@/server/ai/client";
import { aiRequestContext } from "@/server/ai/request";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  conversationId: z.string().max(40).nullable(),
  text: z
    .string()
    .trim()
    .min(1, "Posez une question.")
    .max(8000, "Question trop longue (8 000 caractères au plus)."),
  screen: aiScreenContextSchema.nullable(),
});

/** Question à l'assistant : la réponse arrive en flux (Server-Sent Events). */
export async function POST(request: Request) {
  const ctx = await aiRequestContext();
  if (!ctx) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (!aiConfigured())
    return NextResponse.json(
      { error: "L'assistant n'est pas configuré sur cette installation." },
      { status: 503 },
    );
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
      { status: 400 },
    );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (event: AiStreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          open = false;
        }
      };
      try {
        await runChat({
          ...ctx,
          conversationId: parsed.data.conversationId,
          text: parsed.data.text,
          screen: parsed.data.screen,
          emit,
          signal: request.signal,
        });
      } catch (error) {
        console.error(error);
        emit({ type: "error", message: "Une erreur inattendue a interrompu la réponse." });
      } finally {
        if (open) controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
