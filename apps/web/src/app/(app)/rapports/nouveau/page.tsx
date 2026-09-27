import {
  ENTITIES,
  ENTITY_KEYS,
  type ModuleKey,
  PRESET_REPORTS,
  type ReportDefinition,
  can,
  reportDefinitionSchema,
} from "@quercy/core";
import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { PageHeader } from "@/components/page-header";
import { ReportWorkspace } from "@/components/reports/report-workspace";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "Nouveau rapport" };

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ modele?: string; definition?: string }>;
}) {
  const { modele, definition: rawDefinition } = await searchParams;
  const { organization, role } = await requireWorkspaceContext();
  const allowed = (module: ModuleKey) =>
    organization.modules.includes(module) && can(role.permissions, module, "view");
  const given = parseDefinition(rawDefinition);
  const fromLink = given && allowed(ENTITIES[given.entity].module) ? given : null;
  const preset = fromLink
    ? undefined
    : PRESET_REPORTS.find((p) => p.key === modele && allowed(p.module));
  const firstEntity = ENTITY_KEYS.find((k) => allowed(ENTITIES[k].module));
  if (!preset && !firstEntity) return <Forbidden what="aux rapports (aucun module accessible)" />;
  const definition: ReportDefinition = fromLink ??
    preset?.definition ?? {
      entity: firstEntity!,
      measure: { op: "count" },
      groupBy: ENTITIES[firstEntity!].fields.find((f) => f.type === "select")?.key ?? null,
      dateBucket: null,
      dateField: "createdAt",
      filter: { combinator: "and", rules: [] },
      chart: "bar",
      limit: 12,
      sort: "value_desc",
    };
  return (
    <div className="mx-auto w-full max-w-[2000px] space-y-6 px-8 py-8">
      <PageHeader
        title={preset?.name ?? "Nouveau rapport"}
        description="Réglez les données et l'affichage : le résultat se met à jour en direct."
      />
      <ReportWorkspace
        initialDefinition={definition}
        presetName={preset?.name}
        presetPeriod={preset?.period}
      />
    </div>
  );
}

/** Définition transmise par lien (graphique de l'assistant), ignorée si invalide. */
function parseDefinition(raw: string | undefined): ReportDefinition | null {
  if (!raw) return null;
  try {
    const parsed = reportDefinitionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
