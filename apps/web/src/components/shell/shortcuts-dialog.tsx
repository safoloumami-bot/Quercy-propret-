"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@quercy/ui/components/dialog";

import { SHORTCUTS } from "@/lib/shortcuts";

import { KeyCombo } from "./key-combo";
import { useShell } from "./shell-context";

export function ShortcutsDialog() {
  const { helpOpen, setHelpOpen } = useShell();
  const groups = [...new Set(SHORTCUTS.map((s) => s.group))];

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Raccourcis clavier</DialogTitle>
          <DialogDescription>
            Tout se fait au clavier. Appuyez sur <strong>?</strong> à tout moment pour revoir cette
            liste.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          {groups.map((group) => (
            <section key={group} aria-labelledby={`shortcuts-${group}`}>
              <h3
                id={`shortcuts-${group}`}
                className="mb-1.5 text-xs font-medium text-muted-foreground"
              >
                {group}
              </h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {SHORTCUTS.filter((s) => s.group === group).map((shortcut) => (
                  <li
                    key={shortcut.description}
                    className="flex h-10 items-center justify-between px-3 text-sm"
                  >
                    <span>{shortcut.description}</span>
                    <KeyCombo keys={shortcut.keys} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
