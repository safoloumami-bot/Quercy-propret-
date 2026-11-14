import { can } from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { MembersManager } from "@/components/settings/members/members-manager";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Membres" };

export default async function MembersPage() {
  const { role, organization } = await requireWorkspaceContext();
  if (!can(role.permissions, "members", "view")) return <Forbidden what="à la liste des membres" />;
  return (
    <MembersManager
      organizationName={organization.name}
      isOwner={role.systemKey === "owner"}
      canInvite={can(role.permissions, "members", "create")}
      canAdmin={can(role.permissions, "members", "admin")}
      canRemove={can(role.permissions, "members", "delete")}
    />
  );
}
