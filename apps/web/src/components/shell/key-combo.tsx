"use client";

import { Kbd } from "@quercy/ui/components/kbd";
import { modKeyLabel } from "@quercy/ui/lib/shortcuts";
import * as React from "react";

/** Affiche une combinaison de touches (« mod » devient Ctrl ou ⌘ selon la plateforme). */
export function KeyCombo({ keys, className }: { keys: string[]; className?: string }) {
  const [mod, setMod] = React.useState("Ctrl");
  React.useEffect(() => setMod(modKeyLabel()), []);
  return (
    <span className={className ?? "flex items-center gap-1"}>
      {keys.map((k) => (
        <Kbd key={k}>{k === "mod" ? mod : k}</Kbd>
      ))}
    </span>
  );
}
