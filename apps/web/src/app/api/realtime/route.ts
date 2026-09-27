import { fileRequestContext } from "@/server/files/access";
import { type RealtimeEvent, orgChannel, subscriber } from "@/server/realtime";

export const dynamic = "force-dynamic";

/**
 * Flux temps réel (Server-Sent Events) de l'espace actif : modifications de fiches,
 * commentaires et notifications. Le navigateur se reconnecte seul en cas de coupure.
 */
export async function GET(request: Request) {
  const ctx = await fileRequestContext();
  if (!ctx) return new Response("Non connecté.", { status: 401 });
  const userId = ctx.user.id;
  const sub = subscriber();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Flux déjà fermé.
        }
      };
      send("retry: 5000\n\n");
      sub.on("message", (_channel, message) => {
        const event = JSON.parse(message) as RealtimeEvent;
        // Une notification ne concerne que son destinataire.
        if (event.type === "notification" && event.userId !== userId) return;
        send(`data: ${message}\n\n`);
      });
      await sub.subscribe(orgChannel(ctx.organizationId));
      const keepAlive = setInterval(() => send(": ping\n\n"), 25_000);
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        void sub.quit();
        try {
          controller.close();
        } catch {
          // Déjà fermé.
        }
      });
    },
    cancel() {
      void sub.quit();
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
