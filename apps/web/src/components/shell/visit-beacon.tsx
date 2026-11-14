"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

/** Identifiants de fiches remplacés : « /crm/entreprises/:id » plutôt qu'une page par fiche. */
export function normalizePath(path: string): string {
  return path
    .split("/")
    .map((s) => (/^[a-z0-9]{20,}$/i.test(s) || /^[0-9a-f-]{32,36}$/i.test(s) ? ":id" : s))
    .join("/");
}

/** Compte les pages ouvertes du logiciel (statistiques de l'administration, sans cookie). */
export function VisitBeacon() {
  const pathname = usePathname();
  const first = React.useRef(true);
  React.useEffect(() => {
    const referrer = first.current ? document.referrer : null;
    first.current = false;
    void fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: normalizePath(pathname), referrer }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
