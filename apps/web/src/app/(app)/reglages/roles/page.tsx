import { can } from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { RolesManager } from "@/components/settings/roles/roles-manager";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Rôles et permissions" };

export default async function RolesPage() {
  const { role, organization } = await requireWorkspaceContext();
  if (!can(role.permissions, "settings", "admin"))
    return <Forbidden what="à la gestion des rôles" />;
  return <RolesManager activeModules={organization.modules} />;
}
