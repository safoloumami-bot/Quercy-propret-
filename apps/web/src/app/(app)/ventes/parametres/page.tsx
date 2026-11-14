import { can } from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { SalesSettingsForm } from "@/components/sales/settings-form";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Paramètres de vente" };

export default async function SalesSettingsPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!organization.modules.includes("sales"))
    return <Forbidden what="à ce module, désactivé dans l'espace" />;
  if (!can(role.permissions, "sales", "view")) return <Forbidden what="aux ventes" />;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-8 py-8">
      <PageHeader
        title="Paramètres de vente"
        description="Mentions légales, numérotation, conditions de paiement, relances et paiement en ligne."
      />
      <SalesSettingsForm />
    </div>
  );
}
