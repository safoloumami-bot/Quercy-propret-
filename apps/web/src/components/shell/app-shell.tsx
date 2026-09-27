"use client";

import type { ModuleKey, PermissionMatrix } from "@quercy/core";
import * as React from "react";

import type { WorkspaceSummary } from "@/lib/workspace";

import { AssistantProvider } from "../assistant/assistant-context";
import { AssistantPanel } from "../assistant/assistant-panel";
import { RealtimeListener } from "../realtime-listener";
import { CommandPalette } from "./command-palette";
import { RecordTabsBar, RecordTabsProvider } from "./record-tabs";
import { AccessProvider } from "./access-context";
import { ShellProvider } from "./shell-context";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useGlobalShortcuts } from "./use-global-shortcuts";

function GlobalShortcuts() {
  useGlobalShortcuts();
  // Marqueur « interface prête » (raccourcis branchés), utile aux outils d'automatisation.
  React.useEffect(() => {
    document.documentElement.dataset.ready = "true";
  }, []);
  return null;
}

export interface AppShellProps {
  initialCollapsed: boolean;
  current: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  user: { name: string; email: string; image: string | null };
  roleName: string;
  permissions: PermissionMatrix;
  /** Modules activés dans l'espace. */
  modules: ModuleKey[];
  /** Bandeau affiché au-dessus du contenu (état de l'abonnement, session d'assistance…). */
  banner?: React.ReactNode;
  /** Propriétaire du SaaS : accès à l'administration de la plateforme. */
  platformAdmin?: boolean;
  children: React.ReactNode;
}

/** Cadre de l'application : barre latérale, barre supérieure, palette et raccourcis. */
export function AppShell({
  initialCollapsed,
  current,
  workspaces,
  user,
  roleName,
  permissions,
  modules,
  banner,
  platformAdmin = false,
  children,
}: AppShellProps) {
  return (
    <ShellProvider initialCollapsed={initialCollapsed}>
      <AccessProvider modules={modules} permissions={permissions}>
        <RecordTabsProvider>
          <AssistantProvider>
            <GlobalShortcuts />
            <RealtimeListener />
            <a
              href="#contenu"
              className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
            >
              Aller au contenu
            </a>
            <div className="flex h-dvh overflow-hidden">
              <Sidebar
                current={current}
                workspaces={workspaces}
                user={user}
                roleName={roleName}
                permissions={permissions}
                modules={modules}
                platformAdmin={platformAdmin}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar />
                {banner}
                <RecordTabsBar />
                <main id="contenu" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
                  {children}
                </main>
              </div>
              <AssistantPanel />
            </div>
            <CommandPalette
              currentWorkspaceId={current.id}
              workspaces={workspaces}
              permissions={permissions}
              modules={modules}
            />
            <ShortcutsDialog />
          </AssistantProvider>
        </RecordTabsProvider>
      </AccessProvider>
    </ShellProvider>
  );
}
