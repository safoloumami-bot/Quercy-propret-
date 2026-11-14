import { grantedScope } from "@quercy/core";
import type { Metadata } from "next";

import { PlanningBoard } from "@/components/cleaning/planning-board";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Planning des agents" };

export default async function PlanningPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  if (!grantedScope(role.permissions, "cleaning", "view")) return <Forbidden what="à ce module" />;
  const update = grantedScope(role.permissions, "cleaning", "update");
  return (
    <div className="w-full space-y-6 px-8 py-8">
      <PageHeader
        title="Planning des agents"
        description="Les interventions de la semaine par agent. Les contrats d'entretien remplissent le planning trois semaines à l'avance ; un agent absent ? Confiez ses passages à un collègue."
      />
      <PlanningBoard canManage={update === "all" || update === "team"} />
    </div>
  );
}
