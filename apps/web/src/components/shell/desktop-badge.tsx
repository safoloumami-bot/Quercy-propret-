"use client";

import * as React from "react";

import { desktop, isDesktop } from "@/lib/desktop";

interface Item {
  id: string;
  title: string;
  body: string | null;
  readAt: Date | null;
}

/**
 * Application de bureau : badge de l'icône = notifications non lues, et notification du
 * système pour chaque nouvelle notification reçue (pas pour celles déjà présentes au démarrage).
 */
export function useDesktopBadge(count: number, items: Item[] | undefined) {
  const seen = React.useRef<Set<string> | null>(null);
  React.useEffect(() => {
    if (isDesktop()) void desktop("set_badge", { count });
  }, [count]);
  React.useEffect(() => {
    if (!items || !isDesktop()) return;
    if (seen.current === null) {
      seen.current = new Set(items.map((n) => n.id));
      return;
    }
    for (const n of items) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (!n.readAt) void desktop("notify", { title: n.title, body: n.body ?? undefined });
    }
  }, [items]);
}
