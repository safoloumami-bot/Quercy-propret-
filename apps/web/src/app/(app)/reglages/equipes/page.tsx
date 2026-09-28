import { can } from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { TeamsManager } from "@/components/settings/teams-manager";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Équipes" };

export default async function TeamsPage() {
  const { role } = await requireWorkspaceContext();
  if (!can(role.permissions, "members", "view")) return <Forbidden what="aux équipes" />;
  return <TeamsManager canEdit={can(role.permissions, "members", "admin")} />;
}
