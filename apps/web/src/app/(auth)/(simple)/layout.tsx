import type * as React from "react";

import { AuthShell } from "@/components/auth/auth-shell";

/** Mot de passe oublié, réinitialisation : le formulaire seul, centré. */
export default function SimpleLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell showcase={false}>{children}</AuthShell>;
}
