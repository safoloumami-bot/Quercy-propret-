import { grantedScope } from "@quercy/core";
import type { Metadata } from "next";

import { WorkersBoard } from "@/components/cleaning/workers-board";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Intervenants" };

export default async function Page() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  const scope = grantedScope(role.permissions, "cleaning", "update");
  if (!scope || scope === "own")
    return <Forbidden what="à cette page (réservée aux responsables)" />;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Intervenants"
        description="Salariés, sous-traitants et dirigeants : activités, zone, coût horaire, remplaçants n°1 et n°2, véhicule. Les attestations des sous-traitants sont suivies, avec une alerte avant leur expiration."
      />
      <WorkersBoard />
    </div>
  );
}
