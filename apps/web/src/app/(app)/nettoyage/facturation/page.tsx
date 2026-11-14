import type { Metadata } from "next";

import { BillingBoard } from "@/components/cleaning/billing-board";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Facturation des passages" };

export default async function CleaningBillingPage() {
  const { organization } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Facturation des passages"
        description="Une facture par client et par mois, depuis les passages : forfaits avec les passages manqués déduits, passages réalisés au prix prévu, suppléments validés. Les factures sont créées en brouillon, à relire puis émettre."
      />
      <BillingBoard />
    </div>
  );
}
