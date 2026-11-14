import { can } from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { WebsiteEditor } from "@/components/website/website-editor";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Mon site" };

export default async function WebsitePage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("website"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  if (!can(role.permissions, "website", "view")) return <Forbidden what="au site web" />;
  return <WebsiteEditor />;
}
