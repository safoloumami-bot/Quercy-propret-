import { can } from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { AuditLogView } from "@/components/settings/audit-log";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Journal d'audit" };

export default async function AuditPage() {
  const { role } = await requireWorkspaceContext();
  if (!can(role.permissions, "audit", "view")) return <Forbidden what="au journal d'audit" />;
  return <AuditLogView canListMembers={can(role.permissions, "members", "view")} />;
}
