import type { Metadata } from "next";

import { Forbidden } from "@/components/forbidden";
import { EntityListPage } from "@/components/records/entity-list-page";
import { loadEntityPage } from "@/lib/entity-page";

export const metadata: Metadata = { title: "Contacts" };

export default async function ListPage() {
  const page = await loadEntityPage("contact");
  if (!page.allowed)
    return (
      <Forbidden what={page.enabled ? "à ce module" : "à ce module, désactivé dans l'espace"} />
    );
  return (
    <EntityListPage
      entity="contact"
      fields={page.fields}
      permissions={page.permissions}
      meId={page.meId}
    />
  );
}
