"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Fine barre en haut de l'écran : elle apparaît dès qu'on clique sur un lien ou qu'une action
 * attend le serveur, pour qu'un clic ne paraisse jamais sans effet.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const [navigating, setNavigating] = useState(false);
  const [visible, setVisible] = useState(false);

  // Fin de la navigation : la nouvelle adresse est affichée.
  useEffect(() => setNavigating(false), [pathname, searchParams]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      setNavigating(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const busy = navigating || fetching > 0 || mutating > 0;
  useEffect(() => {
    if (!busy) return setVisible(false);
    const timer = window.setTimeout(() => setVisible(true), navigating ? 0 : 150);
    return () => window.clearTimeout(timer);
  }, [busy, navigating]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="h-full w-2/5 animate-[quercy-progress_1s_ease-in-out_infinite] rounded-r-full bg-primary" />
    </div>
  );
}
