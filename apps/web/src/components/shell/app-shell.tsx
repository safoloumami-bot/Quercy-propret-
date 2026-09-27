"use client";

import type { PermissionMatrix } from "@quercy/core";
import type * as React from "react";

import type { WorkspaceSummary } from "@/lib/workspace";

import { CommandPalette } from "./command-palette";
import { ShellProvider } from "./shell-context";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useGlobalShortcuts } from "./use-global-shortcuts";

function GlobalShortcuts() {
  useGlobalShortcuts();
  return null;
}

export interface AppShellProps {
  initialCollapsed: boolean;
  current: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  user: { name: string; email: string; image: string | null };
  roleName: string;
  permissions: PermissionMatrix;
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
  children,
}: AppShellProps) {
  return (
    <ShellProvider initialCollapsed={initialCollapsed}>
      <GlobalShortcuts />
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
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="contenu" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette
        currentWorkspaceId={current.id}
        workspaces={workspaces}
        permissions={permissions}
      />
      <ShortcutsDialog />
    </ShellProvider>
  );
}
