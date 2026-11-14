"use client";

import { toast } from "@quercy/ui/components/toaster";
import { useQueryClient } from "@tanstack/react-query";
import { CloudOffIcon, RefreshCwIcon } from "lucide-react";
import * as React from "react";

import { errorMessage, useTRPCClient } from "@/lib/trpc";
import { type QueuedCreate, onQueueChange, readQueue, removeFromQueue } from "@/lib/offline-queue";

/**
 * Hors ligne : bandeau d'information, file des créations à envoyer, et envoi automatique au
 * retour de la connexion (une création refusée est signalée, jamais perdue en silence).
 */
export function OfflineStatus({ workspaceId }: { workspaceId: string }) {
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const [online, setOnline] = React.useState(true);
  const [queue, setQueue] = React.useState<QueuedCreate[]>([]);
  const syncing = React.useRef(false);

  React.useEffect(() => {
    document.documentElement.dataset.workspace = workspaceId;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, [workspaceId]);

  const sync = React.useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;
    let sent = 0;
    for (const item of readQueue().filter((q) => q.workspaceId === workspaceId)) {
      try {
        await client.records.create.mutate({ entity: item.entity, values: item.values });
        sent++;
        removeFromQueue(item.id);
      } catch (error) {
        const message = errorMessage(error);
        // Erreur réseau : on réessaiera ; refus du serveur : signalé puis retiré.
        if (!navigator.onLine) break;
        removeFromQueue(item.id);
        toast.error(`« ${item.label} » n'a pas pu être enregistré : ${message}`, {
          duration: 15_000,
        });
      }
    }
    syncing.current = false;
    if (sent > 0) {
      toast.success(
        `${sent} création${sent > 1 ? "s" : ""} hors ligne envoyée${sent > 1 ? "s" : ""}.`,
      );
      void queryClient.invalidateQueries();
    }
  }, [client, queryClient, workspaceId]);

  React.useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setQueue(readQueue().filter((q) => q.workspaceId === workspaceId));
    };
    update();
    const goOnline = () => {
      update();
      void sync();
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", update);
    const stop = onQueueChange(update);
    void sync();
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", update);
      stop();
    };
  }, [sync, workspaceId]);

  if (online && queue.length === 0) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-warning/40 bg-warning/10 px-4 py-1.5 text-sm"
    >
      {online ? (
        <RefreshCwIcon className="size-4 animate-spin" aria-hidden />
      ) : (
        <CloudOffIcon className="size-4" aria-hidden />
      )}
      <span>
        {online
          ? "Envoi des créations saisies hors ligne…"
          : "Hors ligne : les écrans déjà consultés restent lisibles ; les nouvelles fiches seront envoyées au retour de la connexion."}
        {queue.length > 0 ? ` ${queue.length} en attente.` : ""}
      </span>
    </div>
  );
}
