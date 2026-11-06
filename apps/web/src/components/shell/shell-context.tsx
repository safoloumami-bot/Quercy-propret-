"use client";

import * as React from "react";

import { SIDEBAR_COOKIE } from "./constants";

interface ShellState {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  /** Téléphone : barre latérale ouverte par-dessus le contenu. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

const ShellContext = React.createContext<ShellState | null>(null);

export function ShellProvider({
  initialCollapsed,
  children,
}: {
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(initialCollapsed);
  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({
      paletteOpen,
      setPaletteOpen,
      helpOpen,
      setHelpOpen,
      sidebarCollapsed,
      toggleSidebar,
      assistantOpen,
      setAssistantOpen,
      mobileNavOpen,
      setMobileNavOpen,
    }),
    [paletteOpen, helpOpen, sidebarCollapsed, toggleSidebar, assistantOpen, mobileNavOpen],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellState {
  const context = React.useContext(ShellContext);
  if (!context) throw new Error("useShell doit être utilisé dans <ShellProvider>.");
  return context;
}
