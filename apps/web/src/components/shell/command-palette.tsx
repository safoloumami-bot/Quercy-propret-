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
import {
  ArrowRightLeftIcon,
  KeyboardIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PanelLeftIcon,
  PlusIcon,
  SunIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";

import type { ModuleKey, PermissionMatrix } from "@quercy/core";
import { useThemePreference } from "@/components/theme-preference";
import { ENTITY_ICONS, NAV_ITEMS, isAllowed } from "@/lib/navigation";
import { useTRPC } from "@/lib/trpc";
import type { WorkspaceSummary } from "@/lib/workspace";

import { KeyCombo } from "./key-combo";
import { useShell } from "./shell-context";
import { signOut } from "./sign-out";
import { useSwitchWorkspace } from "./use-switch-workspace";

export function CommandPalette({
  currentWorkspaceId,
  workspaces,
  permissions,
  modules,
}: {
  currentWorkspaceId: string;
  workspaces: WorkspaceSummary[];
  permissions: PermissionMatrix;
  modules: ModuleKey[];
}) {
  const router = useRouter();
  const { setTheme } = useThemePreference();
  const { paletteOpen, setPaletteOpen, setHelpOpen, toggleSidebar, sidebarCollapsed } = useShell();
  const otherWorkspaces = workspaces.filter((w) => w.id !== currentWorkspaceId);
  const switchWorkspace = useSwitchWorkspace();
  const items = NAV_ITEMS.filter((item) => isAllowed(item, permissions, modules));
  const trpc = useTRPC();
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);
  React.useEffect(() => {
    if (!paletteOpen) setQuery("");
  }, [paletteOpen]);
  const found = useQuery({
    ...trpc.search.global.queryOptions({ q: debounced }),
    enabled: paletteOpen && debounced.length >= 2,
    placeholderData: (previous) => previous,
  });
  const results = debounced.length >= 2 ? (found.data ?? []) : [];

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
      <CommandInput
        placeholder="Rechercher une fiche, aller à un écran, lancer une action…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{found.isFetching ? "Recherche…" : "Aucun résultat."}</CommandEmpty>
        {results.length > 0 ? (
          <CommandGroup heading="Fiches" forceMount>
            {results.map((r) => (
              <CommandItem
                key={`${r.entity}:${r.id}`}
                value={`fiche ${r.entity} ${r.id} ${r.title}`}
                forceMount
                onSelect={() => run(() => router.push(r.url))}
              >
                {React.createElement(ENTITY_ICONS[r.entity])}
                <span className="truncate">{r.title}</span>
                {r.subtitle ? (
                  <span className="truncate text-xs text-muted-foreground">{r.subtitle}</span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        <CommandGroup heading="Aller à">
          {items.map((item) => (
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
                onSelect={() => run(() => switchWorkspace.mutate({ organizationId: workspace.id }))}
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
          <CommandItem
            value="créer un nouvel espace entreprise"
            onSelect={() => run(() => router.push("/bienvenue"))}
          >
            <PlusIcon />
            Créer un espace
          </CommandItem>
          <CommandItem
            value="se déconnecter déconnexion"
            onSelect={() => run(() => void signOut())}
          >
            <LogOutIcon />
            Se déconnecter
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
