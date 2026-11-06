import { grantedScope } from "@quercy/core";
import type { Metadata } from "next";

import { HoursTable } from "@/components/cleaning/hours-table";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Heures et paie" };

export default async function HoursPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  if (!grantedScope(role.permissions, "cleaning", "view")) return <Forbidden what="à ce module" />;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-8 py-8">
      <PageHeader
        title="Heures et paie"
        description="Heures travaillées par agent (pointages des interventions réalisées), avec les heures de nuit, du dimanche et des jours fériés, à transmettre au cabinet de paie."
      />
      <HoursTable canExport={Boolean(grantedScope(role.permissions, "cleaning", "export"))} />
    </div>
  );
}
