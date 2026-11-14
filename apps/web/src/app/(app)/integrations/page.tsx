import { can } from "@quercy/core";
import type { Metadata } from "next";

import { IntegrationsPage } from "@/components/integrations/integrations-page";
import { Forbidden } from "@/components/forbidden";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Intégrations" };

export default async function Page() {
  const { organization, role } = await requireWorkspaceContext();
  if (
    !organization.modules.includes("integrations") ||
    !can(role.permissions, "integrations", "admin")
  )
    return <Forbidden what="aux intégrations (module désactivé ou réservé aux administrateurs)" />;
  return <IntegrationsPage />;
}
