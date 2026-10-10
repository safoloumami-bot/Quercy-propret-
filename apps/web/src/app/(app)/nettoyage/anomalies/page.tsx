import { grantedScope } from "@quercy/core";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AnomaliesBoard } from "@/components/cleaning/anomalies-board";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Anomalies" };

export default async function AnomaliesPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  const scope = grantedScope(role.permissions, "cleaning", "update");
  if (!scope || scope === "own")
    return <Forbidden what="aux anomalies (réservé aux responsables)" />;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Anomalies"
        description="Signalées par les agents depuis l'application ou détectées automatiquement, elles arrivent ici et jamais chez le client. Validez, corrigez ou rejetez ; seule une anomalie validée peut être montrée au client."
      />
      <Suspense>
        <AnomaliesBoard />
      </Suspense>
    </div>
  );
}
