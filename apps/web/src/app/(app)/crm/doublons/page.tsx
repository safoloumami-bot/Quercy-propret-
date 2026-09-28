import { grantedScope } from "@quercy/core";
import type { Metadata } from "next";

import { DuplicatesManager } from "@/components/crm/duplicates-manager";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Doublons" };

export default async function DuplicatesPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("crm"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  if (
    grantedScope(role.permissions, "crm", "update") !== "all" ||
    grantedScope(role.permissions, "crm", "delete") !== "all"
  )
    return <Forbidden what="à la gestion des doublons (accès à toutes les fiches requis)" />;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-8 py-8">
      <PageHeader
        title="Doublons"
        description="Fiches probablement en double (noms proches, même email ou même SIREN). La fusion regroupe tout sur la fiche conservée ; l'autre part à la corbeille."
      />
      <DuplicatesManager />
    </div>
  );
}
