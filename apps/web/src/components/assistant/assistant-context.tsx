"use client";

import type { EntityKey } from "@quercy/core";
import * as React from "react";

interface Focus {
  entity: EntityKey;
  id: string;
}

interface AssistantState {
  /** Fiche ouverte dans un panneau latéral (prioritaire sur l'adresse de la page). */
  focus: Focus | null;
  setFocus: React.Dispatch<React.SetStateAction<Focus | null>>;
  /** Question à poser dès l'ouverture du panneau (actions rapides depuis une fiche). */
  pending: string | null;
  setPending: (text: string | null) => void;
}

const AssistantContext = React.createContext<AssistantState | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [focus, setFocus] = React.useState<Focus | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const value = React.useMemo(() => ({ focus, setFocus, pending, setPending }), [focus, pending]);
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantState {
  const context = React.useContext(AssistantContext);
  if (!context) throw new Error("useAssistant doit être utilisé dans <AssistantProvider>.");
  return context;
}

/** Signale à l'assistant la fiche affichée, tant que le composant est monté. */
export function useAssistantFocus(entity: EntityKey, id: string) {
  const context = React.useContext(AssistantContext);
  const setFocus = context?.setFocus;
  React.useEffect(() => {
    if (!setFocus) return;
    setFocus({ entity, id });
    return () => setFocus((current) => (current?.id === id ? null : current));
  }, [setFocus, entity, id]);
}
