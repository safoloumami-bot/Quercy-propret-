"use client";

import { type Action, type ModuleKey, type PermissionMatrix, can } from "@quercy/core";
import * as React from "react";

interface AccessState {
  modules: ModuleKey[];
  permissions: PermissionMatrix;
  /** Vrai si le module est activé et l'action permise par le rôle. */
  allows: (module: ModuleKey, action: Action) => boolean;
}

const AccessContext = React.createContext<AccessState | null>(null);

/** Droits de la personne connectée dans l'espace courant, pour masquer ce qui lui est interdit. */
export function AccessProvider({
  modules,
  permissions,
  children,
}: {
  modules: ModuleKey[];
  permissions: PermissionMatrix;
  children: React.ReactNode;
}) {
  const value = React.useMemo<AccessState>(
    () => ({
      modules,
      permissions,
      allows: (module, action) => modules.includes(module) && can(permissions, module, action),
    }),
    [modules, permissions],
  );
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessState {
  const context = React.useContext(AccessContext);
  if (!context) throw new Error("useAccess doit être utilisé dans <AccessProvider>.");
  return context;
}
