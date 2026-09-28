import { grantedScope } from "@quercy/core";
import type { Metadata } from "next";

import { MyDay } from "@/components/cleaning/my-day";
import { Forbidden } from "@/components/forbidden";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Ma journée" };

export default async function MyDayPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  if (!grantedScope(role.permissions, "cleaning", "view")) return <Forbidden what="à ce module" />;
  return (
    <div className="w-full px-4 py-6 sm:px-8 sm:py-8">
      <MyDay />
    </div>
  );
}
