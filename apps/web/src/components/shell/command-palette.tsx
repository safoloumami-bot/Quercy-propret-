"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@quercy/ui/components/command";
import { toast } from "@quercy/ui/components/toaster";
import {
  ArrowRightLeftIcon,
  KeyboardIcon,
  MonitorIcon,
  MoonIcon,
  PanelLeftIcon,
  SunIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";

import { switchWorkspace } from "@/app/(app)/actions";
import { NAV_ITEMS } from "@/lib/navigation";
import type { WorkspaceSummary } from "@/lib/workspace";

import { KeyCombo } from "./key-combo";
import { useShell } from "./shell-context";

export function CommandPalette({
  currentWorkspaceId,
  workspaces,
}: {
  currentWorkspaceId: string;
  workspaces: WorkspaceSummary[];
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { paletteOpen, setPaletteOpen, setHelpOpen, toggleSidebar, sidebarCollapsed } = useShell();
  const otherWorkspaces = workspaces.filter((w) => w.id !== currentWorkspaceId);

  const run = React.useCallback(
    (fn: () => void) => {
      setPaletteOpen(false);
      fn();
    },
    [setPaletteOpen],
  );

  return (
    <CommandDialog
      open={paletteOpen}
      onOpenChange={setPaletteOpen}
      title="Palette de commandes"
      description="Aller à un écran ou lancer une action"
    >
      <CommandInput placeholder="Aller à un écran, lancer une action…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Aller à">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
              onSelect={() => run(() => router.push(item.href))}
            >
              <item.icon />
              {item.label}
              {item.goKey ? (
                <CommandShortcut>
                  <KeyCombo keys={["G", item.goKey.toUpperCase()]} />
                </CommandShortcut>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
        {otherWorkspaces.length > 0 ? (
          <CommandGroup heading="Changer d'espace">
            {otherWorkspaces.map((workspace) => (
              <CommandItem
                key={workspace.id}
                value={`espace ${workspace.name}`}
                onSelect={() =>
                  run(async () => {
                    const result = await switchWorkspace(workspace.id);
                    if (result.ok) toast.success(`Vous êtes dans l'espace ${workspace.name}.`);
                    else toast.error(result.error);
                  })
                }
              >
                <ArrowRightLeftIcon />
                {workspace.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        <CommandGroup heading="Apparence">
          <CommandItem value="thème clair light" onSelect={() => run(() => setTheme("light"))}>
            <SunIcon />
            Thème clair
          </CommandItem>
          <CommandItem value="thème sombre dark" onSelect={() => run(() => setTheme("dark"))}>
            <MoonIcon />
            Thème sombre
          </CommandItem>
          <CommandItem
            value="thème automatique système"
            onSelect={() => run(() => setTheme("system"))}
          >
            <MonitorIcon />
            Thème automatique (système)
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Général">
          <CommandItem value="barre latérale replier déplier" onSelect={() => run(toggleSidebar)}>
            <PanelLeftIcon />
            {sidebarCollapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
            <CommandShortcut>
              <KeyCombo keys={["mod", "B"]} />
            </CommandShortcut>
          </CommandItem>
          <CommandItem
            value="raccourcis clavier aide"
            onSelect={() => run(() => setHelpOpen(true))}
          >
            <KeyboardIcon />
            Raccourcis clavier
            <CommandShortcut>
              <KeyCombo keys={["?"]} />
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
