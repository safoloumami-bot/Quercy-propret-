"use client";

import { MinusIcon, SquareIcon, XIcon } from "lucide-react";

import { useDesktop, windowCommand } from "@/lib/desktop";

/**
 * Boutons de fenêtre de l'application de bureau (Windows et Linux : barre de titre intégrée ;
 * macOS garde ses boutons natifs).
 */
export function WindowControls() {
  const { desktop: inDesktop, mac } = useDesktop();
  if (!inDesktop || mac) return null;
  const button =
    "flex h-12 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40";
  return (
    <div className="-mr-4 ml-1 flex">
      <button
        type="button"
        className={button}
        aria-label="Réduire la fenêtre"
        onClick={() => void windowCommand("minimize")}
      >
        <MinusIcon className="size-4" />
      </button>
      <button
        type="button"
        className={button}
        aria-label="Agrandir la fenêtre"
        onClick={() => void windowCommand("toggle_maximize")}
      >
        <SquareIcon className="size-3.5" />
      </button>
      <button
        type="button"
        className={`${button} hover:bg-destructive hover:text-destructive-foreground`}
        aria-label="Fermer la fenêtre"
        onClick={() => void windowCommand("close")}
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
