import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { EntityRecordPage } from "@/components/records/entity-record-page";
import { loadEntityPage } from "@/lib/entity-page";

export const metadata: Metadata = { title: "Entreprise" };

export default async function RecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const [{ id }, { onglet }] = await Promise.all([params, searchParams]);
  const page = await loadEntityPage("company");
  if (!page.allowed) return <Forbidden what="à ce module" />;
  return (
    <EntityRecordPage
      entity="company"
      id={id}
      fields={page.fields}
      permissions={page.permissions}
      meId={page.meId}
      initialTab={onglet}
    />
  );
}
