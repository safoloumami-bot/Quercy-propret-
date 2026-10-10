import { can } from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { ExportSection, LeaveSection } from "@/components/settings/workspace/data-sections";
import { ModulesSection } from "@/components/settings/workspace/modules-section";
import { WorkspaceGeneralForm } from "@/components/settings/workspace/general-form";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Réglages de l'espace" };

export default async function WorkspaceSettingsPage() {
  const { organization, role } = await requireWorkspaceContext();
  if (!can(role.permissions, "settings", "view"))
    return <Forbidden what="aux réglages de l'espace" />;
  const canEdit = can(role.permissions, "settings", "update");
  const isAdmin = can(role.permissions, "settings", "admin");

  return (
    <>
      <PageHeader
        title="Général"
        description={`Informations et préférences de l'espace ${organization.name}.`}
      />
      <WorkspaceGeneralForm
        canEdit={canEdit}
        defaults={{
          name: organization.name,
          industry: organization.industry,
          size: organization.size,
          currency: organization.preferences.currency as "EUR",
          timezone: organization.preferences.timezone,
          dateFormat: organization.preferences.dateFormat,
          locale: organization.preferences.locale,
        }}
      />
      <ModulesSection enabled={organization.modules} canEdit={isAdmin} />
      {isAdmin ? <ExportSection /> : null}
      <LeaveSection organizationName={organization.name} />
    </>
  );
}
