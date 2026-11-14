"use client";

import { cn } from "@quercy/ui/lib/utils";
import { XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

export interface RecordTab {
  href: string;
  title: string;
  entity: string;
}

interface RecordTabsState {
  tabs: RecordTab[];
  open: (tab: RecordTab) => void;
  close: (href: string) => void;
}

const RecordTabsContext = React.createContext<RecordTabsState | null>(null);
const STORAGE_KEY = "quercy:record-tabs";
const MAX_TABS = 12;

/** Onglets internes : plusieurs fiches ouvertes à la fois, comme dans un navigateur. */
export function RecordTabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = React.useState<RecordTab[]>([]);
  React.useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]") as RecordTab[];
      if (Array.isArray(saved)) setTabs(saved.slice(0, MAX_TABS));
    } catch {
      // Ignoré.
    }
  }, []);
  const persist = (next: RecordTab[]) => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignoré.
    }
    return next;
  };
  const open = React.useCallback((tab: RecordTab) => {
    setTabs((current) => {
      const existing = current.find((t) => t.href === tab.href);
      if (existing && existing.title === tab.title) return current;
      const next = existing
        ? current.map((t) => (t.href === tab.href ? tab : t))
        : [...current, tab].slice(-MAX_TABS);
      return persist(next);
    });
  }, []);
  const close = React.useCallback(
    (href: string) => setTabs((current) => persist(current.filter((t) => t.href !== href))),
    [],
  );
  const value = React.useMemo(() => ({ tabs, open, close }), [tabs, open, close]);
  return <RecordTabsContext.Provider value={value}>{children}</RecordTabsContext.Provider>;
}

export function useRecordTabs(): RecordTabsState {
  const context = React.useContext(RecordTabsContext);
  if (!context) throw new Error("useRecordTabs doit être utilisé dans <RecordTabsProvider>.");
  return context;
}

export function RecordTabsBar() {
  const { tabs, close } = useRecordTabs();
  const pathname = usePathname();
  const router = useRouter();
  if (tabs.length === 0) return null;
  return (
    <nav
      aria-label="Fiches ouvertes"
      className="flex h-9 shrink-0 items-end gap-0.5 overflow-x-auto border-b border-border bg-muted/40 px-3"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <div
            key={tab.href}
            className={cn(
              "group flex h-8 max-w-56 items-center gap-1 rounded-t-md border border-b-0 px-2.5 text-xs",
              active
                ? "border-border bg-background font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:bg-background/60",
            )}
          >
            <Link
              href={tab.href}
              className="truncate outline-none focus-visible:underline"
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  close(tab.href);
                }
              }}
              aria-current={active ? "page" : undefined}
            >
              {tab.title}
            </Link>
            <button
              type="button"
              onClick={() => {
                close(tab.href);
                if (active) router.push(tab.href.split("/").slice(0, -1).join("/"));
              }}
              className="rounded-sm p-0.5 opacity-60 hover:bg-accent hover:opacity-100"
              aria-label={`Fermer l'onglet ${tab.title}`}
            >
              <XIcon className="size-3" />
            </button>
          </div>
        );
      })}
    </nav>
  );
}
