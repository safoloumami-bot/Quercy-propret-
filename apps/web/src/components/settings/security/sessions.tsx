"use client";

import { Badge } from "@quercy/ui/components/badge";
import { Button } from "@quercy/ui/components/button";
import { Skeleton } from "@quercy/ui/components/skeleton";
import { toast } from "@quercy/ui/components/toaster";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LaptopIcon, MonitorIcon, SmartphoneIcon } from "lucide-react";
import * as React from "react";

import { authClient, authErrorMessage } from "@/lib/auth-client";

import { SettingsSection } from "../section";

/** Description lisible d'un user-agent (navigateur et système), sans dépendance. */
export function describeUserAgent(ua: string | null | undefined): {
  label: string;
  kind: "desktop" | "mobile" | "app";
} {
  if (!ua) return { label: "Appareil inconnu", kind: "desktop" };
  const kind = /Tauri/i.test(ua)
    ? "app"
    : /Mobile|Android|iPhone|iPad/i.test(ua)
      ? "mobile"
      : "desktop";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : kind === "app"
            ? "Application Quercy"
            : "Navigateur";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return { label: os ? `${browser} sur ${os}` : browser, kind };
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export function SessionsSection({ currentSessionId }: { currentSessionId: string }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState<string | null>(null);
  const sessions = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: async () => {
      const { data, error } = await authClient.listSessions();
      if (error) throw new Error(authErrorMessage(error));
      return [...(data ?? [])].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    },
  });

  async function revoke(token: string) {
    setPending(token);
    const { error } = await authClient.revokeSession({ token });
    setPending(null);
    if (error) return toast.error(authErrorMessage(error));
    toast.success("Appareil déconnecté.");
    await queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
  }

  async function revokeOthers() {
    setPending("others");
    const { error } = await authClient.revokeOtherSessions();
    setPending(null);
    if (error) return toast.error(authErrorMessage(error));
    toast.success("Tous vos autres appareils ont été déconnectés.");
    await queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
  }

  const others = (sessions.data ?? []).filter((s) => s.id !== currentSessionId).length;

  return (
    <SettingsSection
      id="sessions"
      title="Appareils connectés"
      description="Déconnectez un appareil perdu ou que vous ne reconnaissez pas."
      footer={
        others > 0 ? (
          <Button variant="secondary" onClick={revokeOthers} disabled={pending !== null}>
            Déconnecter les autres appareils
          </Button>
        ) : null
      }
    >
      {sessions.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : sessions.isError ? (
        <p className="text-sm text-destructive">{sessions.error.message}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {sessions.data.map((s) => {
            const device = describeUserAgent(s.userAgent);
            const Icon =
              device.kind === "mobile"
                ? SmartphoneIcon
                : device.kind === "app"
                  ? MonitorIcon
                  : LaptopIcon;
            const current = s.id === currentSessionId;
            return (
              <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {device.label}
                    {current ? <Badge variant="primary">Cet appareil</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.ipAddress ? `${s.ipAddress} · ` : ""}Dernière activité :{" "}
                    {dateFormat.format(new Date(s.updatedAt))}
                  </p>
                </div>
                {current ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke(s.token)}
                    disabled={pending !== null}
                  >
                    Déconnecter
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SettingsSection>
  );
}
