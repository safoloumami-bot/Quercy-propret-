import type { Metadata } from "next";

import { FinanceDashboard } from "@/components/finance/finance-dashboard";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Pilotage financier" };

export default async function FinancePage() {
  const { organization } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Pilotage financier"
        description="Chiffre d'affaires produit par les passages, coûts directs et marge contributive, par contrat, client, site et activité. Les contrats sous la marge minimale ressortent en tête."
      />
      <FinanceDashboard />
    </div>
  );
}
