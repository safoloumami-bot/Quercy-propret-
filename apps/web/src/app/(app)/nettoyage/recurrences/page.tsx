import { grantedScope } from "@quercy/core";
import type { Metadata } from "next";

import { SeriesBoard } from "@/components/cleaning/series-board";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Récurrences" };

export default async function RecurrencesPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  const scope = grantedScope(role.permissions, "cleaning", "update");
  if (!scope || scope === "own")
    return <Forbidden what="aux récurrences (réservé aux responsables)" />;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Récurrences"
        description="La fréquence de chaque prestation : règle, jours fériés, versions successives. Une règle validée planifie seule les passages sur trois mois glissants ; un changement crée une nouvelle version sans toucher au passé."
      />
      <SeriesBoard />
    </div>
  );
}
