import type { Metadata } from "next";
import { Suspense } from "react";

import { AbsencesBoard } from "@/components/cleaning/absences-board";
import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Absences" };

export default async function AbsencesPage() {
  const { organization } = await requireWorkspaceContext();
  if (!organization.modules.includes("cleaning"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Absences"
        description="Congés, maladies et indisponibilités. Une absence validée affiche les passages touchés et propose les remplaçants : n°1, n°2, agent qualifié, puis sous-traitant."
      />
      <Suspense>
        <AbsencesBoard />
      </Suspense>
    </div>
  );
}
