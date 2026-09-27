"use client";

import { Button } from "@quercy/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@quercy/ui/components/popover";
import { cn } from "@quercy/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSignIcon, BellIcon, MessageSquareIcon, UserPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useTRPC } from "@/lib/trpc";

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
function relative(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86_400), "day");
}

const ICONS: Record<string, typeof BellIcon> = {
  mention: AtSignIcon,
  comment: MessageSquareIcon,
  "record.assigned": UserPlusIcon,
};

/** Centre de notifications (mentions, commentaires, attributions). */
export function NotificationsBell() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const unread = useQuery({
    ...trpc.notifications.unreadCount.queryOptions(),
    refetchInterval: 120_000,
  });
  const list = useQuery(trpc.notifications.list.queryOptions());
  const refresh = () => queryClient.invalidateQueries(trpc.notifications.pathFilter());
  const markRead = useMutation(
    trpc.notifications.markRead.mutationOptions({ onSuccess: () => void refresh() }),
  );
  const markAll = useMutation(
    trpc.notifications.markAllRead.mutationOptions({ onSuccess: () => void refresh() }),
  );
  const count = unread.data ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={count > 0 ? `Notifications (${count} non lues)` : "Notifications"}
          className="relative"
        >
          <BellIcon />
          {count > 0 ? (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground tabular-nums">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {count > 0 ? (
            <Button variant="link" size="sm" onClick={() => markAll.mutate()}>
              Tout marquer comme lu
            </Button>
          ) : null}
        </div>
        {list.data && list.data.length > 0 ? (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {list.data.map((n) => {
              const Icon = ICONS[n.type] ?? BellIcon;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.readAt) markRead.mutate({ ids: [n.id] });
                      if (n.url) router.push(n.url);
                    }}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left hover:bg-accent",
                      !n.readAt && "bg-primary/5",
                    )}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="block text-sm">{n.title}</span>
                      {n.body ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="block text-xs text-muted-foreground">
                        {relative(new Date(n.createdAt))}
                      </span>
                    </span>
                    {!n.readAt ? (
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Non lue"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune notification pour l&apos;instant.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
