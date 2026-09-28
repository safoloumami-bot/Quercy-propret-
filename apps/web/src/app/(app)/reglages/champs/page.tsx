import { can } from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { CustomFieldsManager } from "@/components/settings/custom-fields-manager";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Champs personnalisés" };

export default async function CustomFieldsPage() {
  const { role } = await requireWorkspaceContext();
  if (!can(role.permissions, "settings", "admin"))
    return <Forbidden what="aux champs personnalisés" />;
  return <CustomFieldsManager />;
}
