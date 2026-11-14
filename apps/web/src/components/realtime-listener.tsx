"use client";

import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { useTRPC } from "@/lib/trpc";

/** Abonnement aux mises à jour en direct de l'espace (SSE) : les écrans se rafraîchissent seuls. */
export function RealtimeListener() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  React.useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource("/api/realtime");
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as { type: string };
        if (event.type === "record.changed") {
          void queryClient.invalidateQueries(trpc.records.pathFilter());
          void queryClient.invalidateQueries(trpc.audit.forRecord.pathFilter());
          void queryClient.invalidateQueries(trpc.files.pathFilter());
        } else if (event.type === "comment.changed") {
          void queryClient.invalidateQueries(trpc.comments.pathFilter());
        } else if (event.type === "notification") {
          void queryClient.invalidateQueries(trpc.notifications.pathFilter());
          window.dispatchEvent(new CustomEvent("quercy:notification"));
        }
      } catch {
        // Message illisible : ignoré.
      }
    };
    return () => source.close();
  }, [queryClient, trpc]);
  return null;
}
