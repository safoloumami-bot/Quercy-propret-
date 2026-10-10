"use client";

import { Button } from "@quercy/ui/components/button";
import { toast } from "@quercy/ui/components/toaster";
import { ExternalLinkIcon, PrinterIcon } from "lucide-react";
import * as React from "react";

import { desktop, useDesktop } from "@/lib/desktop";

/** Application de bureau : ouvre la fiche dans une fenêtre séparée. */
export function OpenInWindowButton({ path }: { path: string }) {
  const { desktop: inDesktop } = useDesktop();
  if (!inDesktop) return null;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Ouvrir dans une nouvelle fenêtre"
      title="Ouvrir dans une nouvelle fenêtre"
      onClick={() =>
        void desktop("open_window", { path }).catch(() =>
          toast.error("Impossible d'ouvrir une nouvelle fenêtre."),
        )
      }
    >
      <ExternalLinkIcon />
    </Button>
  );
}

/** Impression du PDF d'un document via la boîte de dialogue du système (navigateur ou bureau). */
export function PrintPdfButton({ href }: { href: string }) {
  const [pending, setPending] = React.useState(false);
  const print = () => {
    setPending(true);
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    frame.src = href;
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.open(href, "_blank", "noopener");
      }
      setPending(false);
      setTimeout(() => frame.remove(), 60_000);
    };
    document.body.appendChild(frame);
  };
  return (
    <Button variant="secondary" onClick={print} disabled={pending}>
      <PrinterIcon />
      Imprimer
    </Button>
  );
}
