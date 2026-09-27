"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@quercy/ui/components/dropdown-menu";
import { toast } from "@quercy/ui/components/toaster";
import { cn } from "@quercy/ui/lib/utils";
import { CheckIcon, ChevronsUpDownIcon, PaletteIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { switchWorkspace } from "@/app/(app)/actions";
import type { WorkspaceSummary } from "@/lib/workspace";

import { WorkspaceAvatar } from "./workspace-avatar";

export function WorkspaceSwitcher({
  current,
  workspaces,
  collapsed,
}: {
  current: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  collapsed: boolean;
}) {
  const [pending, startTransition] = React.useTransition();

  function onSwitch(workspace: WorkspaceSummary) {
    if (workspace.id === current.id) return;
    startTransition(async () => {
      const result = await switchWorkspace(workspace.id);
      if (result.ok) toast.success(`Vous êtes dans l'espace ${workspace.name}.`);
      else toast.error(result.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md px-1.5 text-left text-sm font-semibold transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[state=open]:bg-sidebar-accent",
          collapsed && "justify-center px-0",
          pending && "opacity-60",
        )}
        aria-label={`Espace : ${current.name}. Changer d'espace`}
      >
        <WorkspaceAvatar workspace={current} />
        {collapsed ? null : (
          <>
            <span className="min-w-0 flex-1 truncate">{current.name}</span>
            <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" aria-hidden />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Espaces</DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.id} onSelect={() => onSwitch(workspace)}>
            <WorkspaceAvatar workspace={workspace} className="size-5" />
            <span className="flex-1 truncate">{workspace.name}</span>
            {workspace.id === current.id ? <CheckIcon className="!text-foreground" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/reglages/apparence">
            <PaletteIcon />
            Apparence de l&apos;espace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
