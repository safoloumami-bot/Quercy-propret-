import { can } from "@quercy/core";
import type { Metadata } from "next";

import { AutomationsPage } from "@/components/automations/automations-page";
import { Forbidden } from "@/components/forbidden";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Automatisations" };

export default async function Page() {
  const { organization, role } = await requireWorkspaceContext();
  if (
    !organization.modules.includes("automations") ||
    !can(role.permissions, "automations", "admin")
  )
    return (
      <Forbidden what="aux automatisations (module désactivé ou réservé aux administrateurs)" />
    );
  return <AutomationsPage />;
}
