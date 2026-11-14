import type * as React from "react";

import { AuthShell } from "@/components/auth/auth-shell";

/** Connexion et inscription : formulaire et présentation de sebt. */
export default function PresentationLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
