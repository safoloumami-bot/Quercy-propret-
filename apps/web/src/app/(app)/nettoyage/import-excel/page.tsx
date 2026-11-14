import { grantedScope } from "@quercy/core";
import type { Metadata } from "next";

import { ImportV12 } from "@/components/cleaning/import-v12";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Import du fichier Excel" };

export default async function ImportExcelPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  const scope = grantedScope(role.permissions, "cleaning", "create");
  if (!scope || scope === "own") return <Forbidden what="à l'import (réservé aux responsables)" />;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Import du fichier Excel"
        description="Reprise de votre fichier de pilotage V12 : sites, clients, intervenants, tournées et passages déjà réalisés. Les règles de récurrence sont proposées, puis validées par vous."
      />
      <ImportV12 />
    </div>
  );
}
