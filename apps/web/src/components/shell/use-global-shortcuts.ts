"use client";

import { isTypingTarget } from "@quercy/ui/lib/shortcuts";
import { useRouter } from "next/navigation";
import * as React from "react";

import { type ShortcutState, resolveShortcut } from "@/lib/shortcuts";

import { useShell } from "./shell-context";

/** Écoute le clavier au niveau de la fenêtre et déclenche les raccourcis globaux. */
export function useGlobalShortcuts() {
  const router = useRouter();
  const { setPaletteOpen, paletteOpen, setHelpOpen, toggleSidebar } = useShell();
  const state = React.useRef<ShortcutState>({ pendingGoAt: null });

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      const result = resolveShortcut(
        {
          key: event.key,
          mod: event.metaKey || event.ctrlKey,
          alt: event.altKey,
          typing: isTypingTarget(event.target),
        },
        state.current,
        Date.now(),
      );
      state.current = result.state;
      const action = result.action;
      if (!action) return;

      event.preventDefault();
      switch (action.type) {
        case "palette":
          setPaletteOpen(!paletteOpen);
          break;
        case "help":
          setHelpOpen(true);
          break;
        case "sidebar":
          toggleSidebar();
          break;
        case "create":
          // L'écran courant (liste, fiche) décide quoi créer.
          window.dispatchEvent(new CustomEvent("quercy:create"));
          break;
        case "navigate":
          router.push(action.href);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, paletteOpen, setPaletteOpen, setHelpOpen, toggleSidebar]);
}
