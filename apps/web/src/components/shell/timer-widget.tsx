"use client";

import { Button } from "@quercy/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@quercy/ui/components/command";
import { Input } from "@quercy/ui/components/input";
import { Label } from "@quercy/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@quercy/ui/components/popover";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayIcon, SquareIcon, TimerIcon } from "lucide-react";
import * as React from "react";

import { toastError } from "@/components/toast-error";
import { useTRPC } from "@/lib/trpc";

import { useAccess } from "./access-context";

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Chronomètre de la barre supérieure : démarrer sur une tâche, voir le temps, arrêter. */
export function TimerWidget() {
  const { allows } = useAccess();
  const enabled = allows("projects", "create");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const current = useQuery({
    ...trpc.timer.current.queryOptions(),
    enabled,
    refetchInterval: 60_000,
  });
  const [now, setNow] = React.useState(() => Date.now());
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [description, setDescription] = React.useState("");
  const tasks = useQuery({
    ...trpc.records.options.queryOptions({ kind: "task", search: search || undefined }),
    enabled: enabled && open,
  });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries(trpc.timer.pathFilter()),
      queryClient.invalidateQueries(trpc.records.pathFilter()),
    ]);
  const start = useMutation(
    trpc.timer.start.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        setDescription("");
        void refresh();
      },
      onError: toastError,
    }),
  );
  const stop = useMutation(
    trpc.timer.stop.mutationOptions({ onSuccess: () => void refresh(), onError: toastError }),
  );

  const running = current.data;
  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!enabled) return null;
  if (running) {
    return (
      <div className="flex items-center gap-1 rounded-md border border-border bg-accent/60 pl-2">
        <TimerIcon className="size-3.5 text-primary" aria-hidden />
        <span className="max-w-40 truncate text-xs" title={running.label}>
          {running.label}
        </span>
        <span className="font-mono text-xs tabular-nums" aria-live="off">
          {formatElapsed(now - new Date(running.startedAt).getTime())}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => stop.mutate()}
          disabled={stop.isPending}
          aria-label="Arrêter le chronomètre"
        >
          <SquareIcon className="fill-current" />
        </Button>
      </div>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Démarrer un chronomètre">
          <TimerIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="timer-description">Sur quoi travaillez-vous ?</Label>
          <Input
            id="timer-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (facultatif)"
          />
        </div>
        <Command shouldFilter={false} className="rounded-md border border-border">
          <CommandInput value={search} onValueChange={setSearch} placeholder="Choisir une tâche…" />
          <CommandList className="max-h-48">
            <CommandEmpty>{tasks.isPending ? "Recherche…" : "Aucune tâche."}</CommandEmpty>
            <CommandGroup>
              {(tasks.data ?? []).map((t) => (
                <CommandItem
                  key={t.value}
                  value={t.value}
                  onSelect={() =>
                    start.mutate({ taskId: t.value, description: description || undefined })
                  }
                >
                  <PlayIcon />
                  <span className="truncate">{t.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => start.mutate({ description: description || undefined })}
          disabled={start.isPending}
        >
          <PlayIcon />
          Démarrer sans tâche
        </Button>
      </PopoverContent>
    </Popover>
  );
}
