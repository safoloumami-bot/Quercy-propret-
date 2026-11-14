"use client";

import { Avatar, AvatarFallback, initials } from "@quercy/ui/components/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@quercy/ui/components/tooltip";
import { useMutation } from "@tanstack/react-query";
import * as React from "react";

import { useTRPC } from "@/lib/trpc";

/** Personnes qui consultent la même fiche en ce moment (battement toutes les 20 s). */
export function Presence({ presenceKey, meId }: { presenceKey: string; meId?: string }) {
  const trpc = useTRPC();
  const beat = useMutation(trpc.presence.heartbeat.mutationOptions());
  const { mutate, data } = beat;
  React.useEffect(() => {
    mutate({ key: presenceKey });
    const interval = setInterval(() => mutate({ key: presenceKey }), 20_000);
    return () => clearInterval(interval);
  }, [presenceKey, mutate]);
  const others = (data ?? []).filter((p) => p.id !== meId);
  if (others.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5" aria-label="Consultent aussi cette fiche">
      <span className="text-xs text-muted-foreground">Aussi ici :</span>
      <div className="flex -space-x-1.5">
        {others.slice(0, 5).map((p) => (
          <Tooltip key={p.id}>
            <TooltipTrigger asChild>
              <Avatar className="size-6 ring-2 ring-background">
                <AvatarFallback className="text-[10px]">{initials(p.name)}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{p.name} consulte cette fiche</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
