"use client";

import * as React from "react";

interface TauriInternals {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  metadata?: { currentWindow?: { label: string } };
}

function internals(): TauriInternals | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__ ?? null
  );
}

/** Vrai dans l'application de bureau (Tauri), faux dans le navigateur. */
export function isDesktop(): boolean {
  return internals() !== null;
}

/** Appelle une commande de l'application de bureau ; sans effet dans le navigateur. */
export async function desktop(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  const tauri = internals();
  if (!tauri) return null;
  return tauri.invoke(cmd, args);
}

/** Détection après le montage (le rendu serveur ne connaît pas l'application de bureau). */
export function useDesktop(): { desktop: boolean; mac: boolean } {
  const [state, setState] = React.useState({ desktop: false, mac: false });
  React.useEffect(() => {
    const next = {
      desktop: isDesktop(),
      mac: /Mac/.test(navigator.platform || navigator.userAgent),
    };
    // Place pour les boutons natifs de macOS dans la barre de titre intégrée.
    document.documentElement.classList.toggle("mac-desktop", next.desktop && next.mac);
    setState(next);
  }, []);
  return state;
}

/** Commande sur la fenêtre courante (réduire, agrandir, fermer). */
export function windowCommand(action: "minimize" | "toggle_maximize" | "close") {
  const label = internals()?.metadata?.currentWindow?.label ?? "main";
  return desktop(`plugin:window|${action}`, { label });
}
