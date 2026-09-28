import { grantedScope } from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { FecExport } from "@/components/sales/fec-export";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Export comptable (FEC)" };

export default async function AccountingExportPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("sales"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  if (
    grantedScope(role.permissions, "sales", "export") !== "all" &&
    grantedScope(role.permissions, "treasury", "export") !== "all"
  )
    return <Forbidden what="à l'export comptable" />;
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-8 py-8">
      <PageHeader
        title="Export comptable (FEC)"
        description="Fichier des écritures comptables de l'année, au format réglementaire, pour votre expert-comptable ou un contrôle fiscal."
      />
      <FecExport />
    </div>
  );
}
