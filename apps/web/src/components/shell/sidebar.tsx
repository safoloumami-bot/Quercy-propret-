"use client";

import { Kbd } from "@quercy/ui/components/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@quercy/ui/components/tooltip";
import { cn } from "@quercy/ui/lib/utils";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PermissionMatrix } from "@quercy/core";
import type * as React from "react";

import {
  SETTINGS_ENTRY,
  SIDEBAR_SECTIONS,
  activeNavItem,
  filterSections,
  isSettingsPath,
} from "@/lib/navigation";
import type { WorkspaceSummary } from "@/lib/workspace";

import { KeyCombo } from "./key-combo";
import { useShell } from "./shell-context";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

function SidebarTooltip({
  label,
  enabled,
  children,
}: {
  label: React.ReactNode;
  enabled: boolean;
  children: React.ReactElement;
}) {
  if (!enabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

const itemClass =
  "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm font-medium text-sidebar-foreground transition-colors duration-150 outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:size-4 [&_svg]:shrink-0";

export function Sidebar({
  current,
  workspaces,
  user,
  roleName,
  permissions,
  platformAdmin,
}: {
  current: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  user: { name: string; email: string; image: string | null };
  roleName: string;
  permissions: PermissionMatrix;
  platformAdmin: boolean;
}) {
  const pathname = usePathname();
  const active = activeNavItem(pathname);
  const { sidebarCollapsed: collapsed, toggleSidebar, setPaletteOpen } = useShell();

  return (
    <aside
      aria-label="Barre latérale"
      data-collapsed={collapsed}
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out-quick",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div className={cn("flex items-center gap-1 p-2", collapsed && "flex-col")}>
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher current={current} workspaces={workspaces} collapsed={collapsed} />
        </div>
        <SidebarTooltip
          enabled
          label={
            <>
              {collapsed ? "Déplier" : "Replier"} <KeyCombo keys={["mod", "B"]} />
            </>
          }
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
            aria-label={collapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
          >
            {collapsed ? (
              <PanelLeftOpenIcon className="size-4" />
            ) : (
              <PanelLeftCloseIcon className="size-4" />
            )}
          </button>
        </SidebarTooltip>
      </div>

      <div className="px-2 pb-2">
        <SidebarTooltip enabled={collapsed} label="Rechercher">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              itemClass,
              "w-full text-muted-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <SearchIcon />
            {collapsed ? (
              <span className="sr-only">Rechercher</span>
            ) : (
              <>
                <span className="flex-1 text-left">Rechercher</span>
                <Kbd>/</Kbd>
              </>
            )}
          </button>
        </SidebarTooltip>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-2">
        {filterSections(SIDEBAR_SECTIONS, permissions).map((section) => (
          <div key={section.id} className="mb-4">
            {section.label && !collapsed ? (
              <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{section.label}</p>
            ) : null}
            {section.label && collapsed ? (
              <div className="mx-2 mb-2 h-px bg-sidebar-border" />
            ) : null}
            <ul className="grid gap-0.5">
              {section.items.map((item) => {
                const isActive = active?.id === item.id;
                return (
                  <li key={item.id}>
                    <SidebarTooltip enabled={collapsed} label={item.label}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          itemClass,
                          collapsed && "justify-center px-0",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-primary",
                        )}
                      >
                        <item.icon />
                        {collapsed ? (
                          <span className="sr-only">{item.label}</span>
                        ) : (
                          <span className="truncate">{item.label}</span>
                        )}
                      </Link>
                    </SidebarTooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-2 pb-2">
        <SidebarTooltip enabled={collapsed} label={SETTINGS_ENTRY.label}>
          <Link
            href={SETTINGS_ENTRY.href}
            aria-current={isSettingsPath(pathname) ? "page" : undefined}
            className={cn(
              itemClass,
              collapsed && "justify-center px-0",
              isSettingsPath(pathname) &&
                "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-primary",
            )}
          >
            <SETTINGS_ENTRY.icon />
            {collapsed ? (
              <span className="sr-only">{SETTINGS_ENTRY.label}</span>
            ) : (
              <span className="truncate">{SETTINGS_ENTRY.label}</span>
            )}
          </Link>
        </SidebarTooltip>
      </div>

      <div className="border-t border-sidebar-border p-2">
        <UserMenu
          user={user}
          roleName={roleName}
          collapsed={collapsed}
          platformAdmin={platformAdmin}
        />
      </div>
    </aside>
  );
}
