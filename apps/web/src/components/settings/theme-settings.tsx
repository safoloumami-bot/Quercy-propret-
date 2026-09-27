"use client";

import { cn } from "@quercy/ui/lib/utils";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

const OPTIONS = [
  { value: "light", label: "Clair", icon: SunIcon },
  { value: "dark", label: "Sombre", icon: MoonIcon },
  { value: "system", label: "Automatique", icon: MonitorIcon },
] as const;

/** Aperçu miniature d'un thème (ses propres jetons via la classe `dark`). */
function ThemePreview({ mode }: { mode: "light" | "dark" | "system" }) {
  const pane = (dark: boolean) => (
    <div className={cn(dark ? "dark" : "light", "flex h-full flex-1 bg-background")}>
      <div className="w-1/4 border-r border-sidebar-border bg-sidebar p-1.5">
        <div className="mb-1.5 h-1.5 w-3/4 rounded-full bg-primary" />
        <div className="mb-1 h-1 w-full rounded-full bg-muted-foreground/30" />
        <div className="h-1 w-2/3 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="flex-1 space-y-1.5 p-2">
        <div className="h-1.5 w-1/2 rounded-full bg-foreground/70" />
        <div className="h-6 rounded-sm border border-border bg-card" />
        <div className="h-2 w-8 rounded-sm bg-primary" />
      </div>
    </div>
  );
  return (
    <div aria-hidden className="flex h-20 overflow-hidden rounded-md border border-border">
      {mode === "system" ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(mode === "dark")
      )}
    </div>
  );
}

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const current = mounted ? (theme ?? "system") : null;

  return (
    <div role="radiogroup" aria-label="Thème" className="grid grid-cols-3 gap-3">
      {OPTIONS.map((option) => {
        const selected = current === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option.value)}
            className={cn(
              "space-y-2.5 rounded-lg border border-border bg-card p-2.5 text-left transition-colors outline-none hover:border-input focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected && "border-primary ring-1 ring-primary",
            )}
          >
            <ThemePreview mode={option.value} />
            <span className="flex items-center gap-2 px-0.5 text-sm font-medium">
              <option.icon className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1">{option.label}</span>
              {selected ? <CheckIcon className="size-4 text-primary" aria-hidden /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
