"use client";

import { Button } from "@quercy/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@quercy/ui/components/tooltip";
import { ChevronRightIcon, KeyboardIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { useThemePreference } from "@/components/theme-preference";
import { breadcrumbFor } from "@/lib/navigation";

import { KeyCombo } from "./key-combo";
import { NotificationsBell } from "./notifications-bell";
import { TimerWidget } from "./timer-widget";
import { useShell } from "./shell-context";

export function Topbar() {
  const pathname = usePathname();
  const crumbs = breadcrumbFor(pathname);
  const { setPaletteOpen, setHelpOpen } = useShell();
  const { resolvedTheme, setTheme } = useThemePreference();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
      <nav aria-label="Fil d'Ariane" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={crumb.label} className="flex min-w-0 items-center gap-1.5">
                {index > 0 ? (
                  <ChevronRightIcon className="size-3.5 text-muted-foreground" aria-hidden />
                ) : null}
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className="truncate text-muted-foreground hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={last ? "truncate font-medium" : "truncate text-muted-foreground"}
                    aria-current={last ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-8 w-80 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm text-muted-foreground shadow-xs transition-colors outline-none hover:border-input hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 2xl:w-96"
      >
        <SearchIcon className="size-4" aria-hidden />
        <span className="flex-1 truncate text-left whitespace-nowrap">
          Rechercher ou lancer une action…
        </span>
        <KeyCombo keys={["mod", "K"]} />
      </button>

      <div className="flex items-center gap-1">
        <TimerWidget />
        <NotificationsBell />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Passer au thème clair" : "Passer au thème sombre"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDark ? "Thème clair" : "Thème sombre"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHelpOpen(true)}
              aria-label="Raccourcis clavier"
            >
              <KeyboardIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Raccourcis clavier <KeyCombo keys={["?"]} />
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
